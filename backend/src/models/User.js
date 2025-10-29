const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcrypt");

class User extends Model {
  async comparePassword(password) {
    return bcrypt.compare(password, this.hashed_password);
  }

  // async hashPassword(password) {
  //   const salt = await bcrypt.genSalt(10);
  //   this.hashed_password = await bcrypt.hash(password, salt);
  // }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orcid_id: {
      type: DataTypes.TEXT,
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
      allowNull: false,
    },
    email: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
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
