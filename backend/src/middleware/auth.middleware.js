const jwt = require("jsonwebtoken");
const { User } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "3600";

const setTokenCookie = (res, user) => {
  // create safe user object for token
  const safeUser = {
    id: user.id,
    email: user.email,
    username: user.username,
  };

  // sign JWT token
  const token = jwt.sign({ data: safeUser }, JWT_SECRET, {
    expiresIn: parseInt(JWT_EXPIRES_IN),
  });

  const isProduction = process.env.NODE_ENV === "production";

  //set token in HttpOnly cookie
  res.cookie("token", token, {
    maxAge: JWT_EXPIRES_IN * 1000, // Convert to milliseconds
    httpOnly: true, // Cookie cannot be accessed by client-side JavaScript
    secure: isProduction, // cookie only sent over HTTPS in production
    sameSite: isProduction ? "Lax" : "Lax", // CSRF protection
  });

  return token;
};

// restore user from JWT cookie on every request
const restoreUser = (req, res, next) => {
  // get token from cookies
  const { token } = req.cookies;

  // initialize user as null
  req.user = null;

  // if no token, continue without user
  if (!token) {
    return next();
  }

  // verify and decode token
  return jwt.verify(token, JWT_SECRET, null, async (error, jwtPayload) => {
    if (error) {
      res.clearCookie("token");
      return next();
    }

    try {
      // extract user id from token payload
      const { id } = jwtPayload.data;

      //load user from database
      req.user = await User.findByPk(id, {
        attributes: {
          include: ["id", "username", "email", "created_at", "updated_at"],
          exclude: ["hashed_password"], // Never send password
        },
      });
    } catch (error) {
      res.clearCookie("token");
      return next();
    }

    if (!req.user) {
      res.clearCookie("token");
    }

    return next();
  });
};

// require authentication - user must be logged in
const requireAuth = (req, res, next) => {
  // check if user exists
  if (req.user) {
    return next();
  }

  // user not authenticated
  return res.status(401).json({
    message: "Authentication required",
  });
};

// const authenticateToken = (req, res, next) => {
//   try {
//     // Get token from header
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).json({
//         message: "No authorization token provided",
//       });
//     }

//     // Token format: "Bearer <token>"
//     const token = authHeader.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({
//         message: "Invalid token format",
//       });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, JWT_SECRET);

//     // Add userId to request object
//     req.userId = decoded.userId;
//     req.userEmail = decoded.email;

//     next(); // Continue to the route handler
//   } catch (error) {
//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         message: "Token has expired",
//       });
//     }
//     if (error.name === "JsonWebTokenError") {
//       return res.status(401).json({
//         message: "Invalid token",
//       });
//     }
//     return res.status(401).json({
//       message: "Authentication failed",
//     });
//   }
// };

// module.exports = { authenticateToken };

module.exports = {
  setTokenCookie,
  restoreUser,
  requireAuth,
};
