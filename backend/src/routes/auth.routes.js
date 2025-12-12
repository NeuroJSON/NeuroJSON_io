// request send to postgres
const express = require("express");
const passport = require("passport");
const {
  register,
  login,
  getCurrentUser,
  logout,
  resendVerificationEmail,
} = require("../controllers/auth.controller");
const { verifyEmail } = require("../controllers/verification.controller");
const {
  googleAuth,
  googleCallback,
  // orcidAuth,
  // orcidCallback,
} = require("../controllers/oauth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// traditional authentication routes
router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getCurrentUser);
router.post("/logout", requireAuth, logout);

// email verification routes
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

// Google OAuth routes
router.get(
  "/google",
  googleAuth,
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/?auth=error`,
    session: false, // We're using JWT cookies, not sessions
  }),
  googleCallback
);

// ORCID OAuth routes
// router.get(
//   "/orcid",
//   orcidAuth,
//   passport.authenticate("orcid")
// );

// router.get(
//   "/orcid/callback",
//   passport.authenticate("orcid", {
//     failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:3000"}/?auth=error`,
//     session: false,
//   }),
//   orcidCallback
// );

module.exports = router;
