const { User } = require("../models");
const { setTokenCookie } = require("../middleware/auth.middleware");
const emailService = require("../../services/email.service");
const crypto = require("crypto");

// verify email with token
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        message: "Verification token is required",
        expired: false,
      });
    }

    // hash token to compare
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // find user with this token
    const user = await User.findOne({
      where: {
        verification_token: hashedToken,
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification token",
        expired: false,
      });
    }

    // check if already verified
    if (user.email_verified) {
      return res.status(400).json({
        message: "Email is already verified",
        expired: false,
      });
    }

    // Check if token is valid and not expired
    if (!user.isVerificationTokenValid(token)) {
      return res.status(400).json({
        message: "Verification token has expired. Please request a new one.",
        expired: true,
      });
    }
    // Actually verify the email and clear token
    user.email_verified = true; // Mark as verified
    user.clearVerificationToken(); // Remove token (one-time use)
    await user.save(); // Save to database

    // send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    // log the user in
    setTokenCookie(res, user);

    res.status(200).json({
      message: "Email verified successfully! Welcome to NeuroJSON.io",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: user.email_verified,
      },
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      message: "Error verifying email",
      error: error.message,
      expired: false,
    });
  }
};

module.exports = {
  verifyEmail,
};
