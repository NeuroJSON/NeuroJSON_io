const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Create transporter based on environment
    if (process.env.NODE_ENV === "production") {
      // Production: Use real SMTP
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Development: Use Ethereal (fake SMTP for testing)
      this.createTestTransporter();
    }
  }

  async createTestTransporter() {
    const testAccount = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("📧 Using Ethereal email for development");
    console.log("Preview emails at: https://ethereal.email");
  }

  async sendVerificationEmail(user, token) {
    const verificationUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/verify-email?token=${token}`;

    const mailOptions = {
      from: `"NeuroJSON.io" <${
        process.env.SMTP_FROM || "noreply@neurojson.io"
      }>`,
      to: user.email,
      subject: "Verify Your Email - NeuroJSON.io",
      html: this.getVerificationEmailTemplate(user.username, verificationUrl),
      text: `Hi ${user.username},\n\nPlease verify your email by clicking this link:\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe NeuroJSON.io Team`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV !== "production") {
        console.log("📧 Verification email sent!");
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Email sending error:", error);
      throw new Error("Failed to send verification email");
    }
  }

  async sendWelcomeEmail(user) {
    const mailOptions = {
      from: `"NeuroJSON.io" <${
        process.env.SMTP_FROM || "noreply@neurojson.io"
      }>`,
      to: user.email,
      subject: "Welcome to NeuroJSON.io! 🎉",
      html: this.getWelcomeEmailTemplate(user.username),
      text: `Hi ${user.username},\n\nWelcome to NeuroJSON.io! Your email has been verified.\n\nBest regards,\nThe NeuroJSON.io Team`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      //Log preview URL in development
      if (process.env.NODE_ENV !== "production") {
        console.log("📧 Welcome email sent!");
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
      }
      return { success: true };
    } catch (error) {
      console.error("Welcome email error:", error);
      return { success: false };
    }
  }

  async sendPasswordResetEmail(email, resetUrl, firstName) {
    const mailOptions = {
      from: `"NeuroJSON.io" <${
        process.env.SMTP_FROM || "noreply@neurojson.io"
      }>`,
      to: email,
      subject: "Password Reset Request - NeuroJSON.io",
      html: this.getPasswordResetTemplate(firstName, resetUrl),
      text: `Hi ${firstName},\n\nYou requested to reset your password for your NeuroJSON.io account.\n\nClick this link to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe NeuroJSON.io Team`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);

      if (process.env.NODE_ENV !== "production") {
        console.log("📧 Password reset email sent!");
        console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Password reset email error:", error);
      throw new Error("Failed to send password reset email");
    }
  }

  getVerificationEmailTemplate(username, verificationUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NeuroJSON.io</h1>
            <p>Free Data Worth Sharing</p>
          </div>
          <div class="content">
            <h2>Hi ${username}! 👋</h2>
            <p>Thank you for signing up for NeuroJSON.io! We're excited to have you join our community.</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link:</p>
            <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            <p><strong>This link will expire in 24 hours.</strong></p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 NeuroJSON.io - All rights reserved</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeEmailTemplate(username) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to NeuroJSON.io!</h1>
          </div>
          <div class="content">
            <h2>Hi ${username}!</h2>
            <p>Your email has been verified successfully! Welcome to the NeuroJSON.io community.</p>
            <p>You can now:</p>
            <ul>
              <li>Browse and search neuroimaging datasets</li>
              <li>Preview data in-browser without downloading</li>
              <li>Download datasets via UI or REST API</li>
              <li>Save and like your favorite datasets</li>
              <li>Comment on datasets and share feedback</li>
              <li>Share search results or datasets with shareable links</li>
            </ul>
            <div style="text-align: center;">
              <a href="${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }" class="button">Start Exploring</a>
            </div>
            <p>Happy researching! 🧠</p>
          </div>
          <div class="footer">
            <p>© 2024 NeuroJSON.io - All rights reserved</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(firstName, resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #777; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
            <p>NeuroJSON.io</p>
          </div>
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>You requested to reset your password for your NeuroJSON.io account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <div class="warning">
              <strong>⏱️ This link will expire in 1 hour</strong> for security reasons.
            </div>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>© 2024 NeuroJSON.io - All rights reserved</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
