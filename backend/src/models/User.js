const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

class User extends Model {
  async comparePassword(password) {
    return bcrypt.compare(password, this.hashed_password);
  }

  // Generate email verification token
  generateVerificationToken() {
    // Create random token
    const token = crypto.randomBytes(32).toString("hex");

    // Hash it before storing (security best practice)
    this.verification_token = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Set expiration (24 hours)
    this.verification_token_expires = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );

    // Return unhashed token to send in email
    return token;
  }
  // Verify if token is valid
  isVerificationTokenValid(token) {
    if (!this.verification_token || !this.verification_token_expires) {
      return false; // no token exists
    }

    // Hash provided token to compare
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Check if matches and not expired
    return (
      hashedToken === this.verification_token &&
      this.verification_token_expires > new Date()
    );
  }

  // Clear verification token
  clearVerificationToken() {
    this.verification_token = null;
    this.verification_token_expires = null;
  }

  // Generate password reset token
  generateResetPasswordToken() {
    const token = crypto.randomBytes(32).toString("hex");
    this.reset_password_token = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    this.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour
    return token;
  }

  // Verify if reset token is valid
  isResetPasswordTokenValid(token) {
    if (!this.reset_password_token || !this.reset_password_expires) {
      return false; // no token exists
    }
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    return (
      hashedToken === this.reset_password_token &&
      this.reset_password_expires > new Date()
    );
  }

  // Clear reset token
  clearResetPasswordToken() {
    this.reset_password_token = null;
    this.reset_password_expires = null;
  }

  // Get full name
  getFullName() {
    return `${this.first_name} ${this.last_name}`;
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orcid_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    github_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    hashed_password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    verification_token_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // NEW FIELDS FOR PASSWORD RESET
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    first_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    interests: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = User;
