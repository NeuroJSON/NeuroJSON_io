const jwt = require("jsonwebtoken");
const { User } = require("../models");
const bcrypt = require("bcrypt");

const JWT_SECRET = process.env.JWT_SECRET;

const register = async (req, res) => {
  try {
    const { username, email, password, orcid_id, google_id, github_id } =
      req.body;

    // check if OAuth or traditional signup
    const isOAuthSignup = orcid_id || google_id || github_id;

    // validate required fields
    if (!username || !email) {
      return res.status(400).json({
        message: "Username and email are required",
      });
    }

    // traditional signup: password is required
    if (!isOAuthSignup && !password) {
      return res.status(400).json({
        message: "Password is required for traditional registration",
      });
    }

    // OAuth signup: password should not be provided
    if (isOAuthSignup && password) {
      return res.status(400).json({
        message: "Password should not be provided for OAuth registration",
      });
    }

    if (password && password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // check if email already exists
    const existingEmail = await User.findOne({
      where: { email },
    });

    if (existingEmail) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // check if username already exists
    const existingUsername = await User.findOne({
      where: { username },
    });

    if (existingUsername) {
      return res.status(400).json({
        message: "Username is already taken",
      });
    }

    // hash password
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // create new user
    const user = await User.create({
      username,
      email,
      hashed_password: hashedPassword,
      orcid_id: orcid_id || null,
      google_id: google_id || null,
      github_id: github_id || null,
    });

    // generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        message: "Email or username already exists",
      });
    }

    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // find user
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // check if user has a password(not OAuth-only user)
    if (!user.hashed_password) {
      // Could check which OAuth provider they used
      let oauthProvider = "OAuth";
      if (user.google_id) oauthProvider = "Google";
      else if (user.github_id) oauthProvider = "GitHub";
      else if (user.orcid_id) oauthProvider = "ORCID";

      return res.status(400).json({
        message: `This account uses ${oauthProvider} login. Please sign in with ${oauthProvider}.`,
      });
    }

    // check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};
