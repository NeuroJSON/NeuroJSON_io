const { User } = require("../models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { setTokenCookie } = require("../middleware/auth.middleware");
const emailService = require("../../services/email.service");
const { Op } = require("sequelize");
const { validatePassword } = require("../utils/passwordValidator");

// register new user
const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      orcid_id,
      google_id,
      github_id,
      firstName,
      lastName,
      company,
      interests,
    } = req.body;

    // check if OAuth or traditional signup
    const isOAuthSignup = orcid_id || google_id || github_id;

    // validate required fields
    if (!username || !email) {
      return res.status(400).json({
        message: "Username and email are required",
      });
    }

    // NEW: Validate profile fields for traditional signup
    if (!isOAuthSignup && (!firstName || !lastName || !company)) {
      return res.status(400).json({
        message: "First name, last name, and company/institution are required",
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

    // if (password && password.length < 8) {
    //   return res.status(400).json({
    //     message: "Password must be at least 8 characters long",
    //   });
    // }
    // password validate
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          message: passwordValidation.message,
        });
      }
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
      email_verified: isOAuthSignup ? true : false, // OAuth users auto-verified
      first_name: firstName || "", // NEW
      last_name: lastName || "", // NEW
      company: company || "", // NEW
      interests: interests || null, // NEW
    });

    // For traditional signup, send verification email
    if (!isOAuthSignup) {
      const verificationToken = user.generateVerificationToken();
      await user.save();

      try {
        await emailService.sendVerificationEmail(user, verificationToken);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Don't fail registration if email fails
      }

      return res.status(201).json({
        message:
          "Registration successful! Please check your email to verify your account.",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          email_verified: user.email_verified,
          firstName: user.first_name, // NEW
          lastName: user.last_name, // NEW
          company: user.company, // NEW
          interests: user.interests, // NEW
        },
        requiresVerification: true,
      });
    }

    // OAuth signup: set authentication cookie
    setTokenCookie(res, user);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified,
        firstName: user.first_name, // NEW
        lastName: user.last_name, // NEW
        company: user.company, // NEW
        interests: user.interests, // NEW
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

    // handle sequelize unique constraint errors
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

// login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validate required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // find user by email
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

    // NEW: Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
        email: user.email,
      });
    }

    // set authentication cookie
    setTokenCookie(res, user);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        interests: user.interests,
        isOAuthUser: !!(user.google_id || user.orcid_id || user.github_id),
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// get current authenticated user
const getCurrentUser = async (req, res) => {
  try {
    // user already loaded by restoreUser middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        interests: user.interests,
        isOAuthUser: !!(user.google_id || user.orcid_id || user.github_id),
        hasPassword: !!user.hashed_password, // new add
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// logout user
const logout = async (req, res) => {
  try {
    // clear the authentication cookie
    res.clearCookie("token");
    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      message: "Error logging out",
      error: error.message,
    });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({
        message:
          "If this email exists and is unverified, a verification email has been sent.",
      });
    }

    if (user.email_verified) {
      return res.status(400).json({
        message: "This email is already verified",
      });
    }

    // Generate new token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    await emailService.sendVerificationEmail(user, verificationToken);

    res.status(200).json({
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      message: "Error sending verification email",
      error: error.message,
    });
  }
};

// NEW: Complete profile for OAuth users
const completeProfile = async (req, res) => {
  try {
    const { token, firstName, lastName, company, interests } = req.body;

    // Validate token
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET;

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.purpose !== "profile_completion") {
        return res.status(401).json({ message: "Invalid token" });
      }
    } catch (error) {
      return res.status(401).json({
        message: "Token expired or invalid. Please sign in again.",
      });
    }

    // Validate input
    if (!firstName || !lastName || !company) {
      return res.status(400).json({
        message: "First name, last name, and company/institution are required",
      });
    }

    // Validate field lengths
    if (firstName.trim().length < 1 || firstName.trim().length > 255) {
      return res
        .status(400)
        .json({ message: "First name must be between 1 and 255 characters" });
    }
    if (lastName.trim().length < 1 || lastName.trim().length > 255) {
      return res
        .status(400)
        .json({ message: "Last name must be between 1 and 255 characters" });
    }
    if (company.trim().length < 1 || company.trim().length > 255) {
      return res.status(400).json({
        message: "Company/institution must be between 1 and 255 characters",
      });
    }

    // Find and update user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update profile
    user.first_name = firstName.trim();
    user.last_name = lastName.trim();
    user.company = company.trim();
    user.interests = interests ? interests.trim() : null;
    await user.save();

    // Now set the actual login cookie
    setTokenCookie(res, user);

    res.json({
      message: "Profile completed successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        company: user.company,
        interests: user.interests,
      },
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // const user = req.user;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    // if (newPassword.length < 8) {
    //   return res.status(400).json({
    //     message: "New password must be at least 8 characters long",
    //   });
    // }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.message,
      });
    }

    // REFETCH user with hashed_password field
    // req.user only has basic info, we need to load the password field
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if user has a password (OAuth users don't)
    if (!user.hashed_password) {
      return res.status(400).json({
        message:
          "Cannot change password for OAuth accounts. Please use your OAuth provider.",
      });
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Check if new password is same as current
    const isSameAsOld = await user.comparePassword(newPassword);
    if (isSameAsOld) {
      return res.status(400).json({
        message: "New password must be different from current password",
      });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.hashed_password = hashedPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ where: { email } });

    const successMessage =
      "If an account with that email exists, a password reset link has been sent.";

    if (!user || !user.hashed_password) {
      return res.json({ message: successMessage });
    }

    const resetToken = user.generateResetPasswordToken();
    await user.save();

    const resetUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/reset-password?token=${resetToken}`;

    await emailService.sendPasswordResetEmail(
      user.email,
      resetUrl,
      user.first_name
    );

    res.json({ message: successMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;
    const { password } = req.body;

    // Validation
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // if (password.length < 8) {
    //   return res.status(400).json({
    //     message: "Password must be at least 8 characters long",
    //   });
    // }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        message: passwordValidation.message,
      });
    }

    // Hash the token to match what's stored in database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with this hashed token and non-expired timestamp
    const user = await User.findOne({
      where: {
        reset_password_token: hashedToken,
        reset_password_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired password reset token",
      });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.hashed_password = hashedPassword;
    user.clearResetPasswordToken();
    await user.save();

    res.json({
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  resendVerificationEmail,
  completeProfile,
  changePassword,
  forgotPassword, // New
  resetPassword,
};
