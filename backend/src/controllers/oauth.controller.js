const { setTokenCookie } = require("../middleware/auth.middleware");
const jwt = require("jsonwebtoken"); // new
const JWT_SECRET = process.env.JWT_SECRET; // new

// google oauth initiate
const googleAuth = (req, res, next) => {
  // handled by passport middleware
  next();
};

// google oauth callback
const googleCallback = (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      // OAuth failed, redirect to frontend with error
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/?auth=error&message=Google authentication failed`
      );
    }

    // NEW: Check if profile needs completion
    if (user.needsProfileCompletion()) {
      // Create temporary token for profile completion
      const tempToken = jwt.sign(
        {
          userId: user.id,
          purpose: "profile_completion",
          email: user.email,
          username: user.username,
          firstName: user.first_name || "",
          lastName: user.last_name || "",
        },
        JWT_SECRET,
        { expiresIn: "1h" } // 1 hour to complete profile
      );

      // Redirect to profile completion page
      return res.redirect(
        `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/complete-profile?token=${tempToken}`
      );
    }

    // set authentication cookie
    setTokenCookie(res, user);

    // redirect to frontend with success
    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/?auth=success`
    );
  } catch (error) {
    console.error("Google callback error:", error);
    res.redirect(
      `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/?auth=error&message=Authentication failed`
    );
  }
};

// ORCID OAuth - Initiate
// const orcidAuth = (req, res, next) => {
//     // This will be handled by passport middleware
//     next();
//   };

//   // ORCID OAuth - Callback
//   const orcidCallback = (req, res) => {
//     try {
//       const user = req.user;

//       if (!user) {
//         return res.redirect(
//           `${process.env.FRONTEND_URL || "http://localhost:3000"}/?auth=error&message=ORCID authentication failed`
//         );
//       }

//       // Set authentication cookie
//       setTokenCookie(res, user);

//       // Redirect to frontend with success
//       res.redirect(
//         `${process.env.FRONTEND_URL || "http://localhost:3000"}/?auth=success`
//       );
//     } catch (error) {
//       console.error("ORCID callback error:", error);
//       res.redirect(
//         `${process.env.FRONTEND_URL || "http://localhost:3000"}/?auth=error&message=Authentication failed`
//       );
//     }
//   };

module.exports = {
  googleAuth,
  googleCallback,
  // orcidAuth,
  // orcidCallback,
};
