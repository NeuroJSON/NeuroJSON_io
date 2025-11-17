const { Sequelize } = require("sequelize");
require("dotenv").config();

const env = process.env.NODE_ENV || "development";
const config = require("../../config/config")[env];

// Create sequelize instance from config
const sequelize = new Sequelize(config);

const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log(
      `Database connection established successfully (${config.dialect})`
    );
    console.log("Database ready (use migrations to update schema)");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDatabase };
