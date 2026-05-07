require("dotenv").config();

module.exports = {
  // development: {
  //   dialect: "sqlite",
  //   storage: "./database.sqlite",
  //   logging: console.log,
  // },
  development: {
    dialect: "postgres",
    host: "localhost",
    port: 5432,
    database: "neurojson_dev",
    username: process.env.DB_USER_LOCAL,
    password: process.env.DB_PASSWORD_LOCAL,
    logging: console.log,
  },
  test: {
    dialect: "sqlite",
    storage: ":memory:",
    logging: false,
  },
  production: {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
