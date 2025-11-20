const { setTokenCookie } = require("../middleware/auth.middleware");

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
