const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { connectDatabase, sequelize } = require("./config/database");
const { restoreUser } = require("./middleware/auth.middleware");

const authRoutes = require("./routes/auth.routes");
// const userRoutes = require("./routes/users.routes");
const activitiesRoutes = require("./routes/activities.routes");
const dbsRoutes = require("./routes/dbs.routes");
const datasetsRoutes = require("./routes/datasets.routes");
// const datasetRoutes = require("./routes/dataset.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // parse cookies

// restore user on every request
app.use(restoreUser);

// Routes
app.use("/api/v1/auth", authRoutes);
// app.use("/api/v1/users", userRoutes);
app.use("/api/v1/activities", activitiesRoutes);
app.use("/api/v1/dbs", dbsRoutes);
app.use("/api/v1/datasets", datasetsRoutes);
// app.use("/api/datasets", datasetRoutes);

// health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();

    // Optional: Count records in a table
    const userCount = (await sequelize.models.User?.count()) || 0;

    res.json({
      status: "OK",
      message: "server is running",
      environment: process.env.NODE_ENV || "development",
      database: {
        connected: true,
        dialect: sequelize.getDialect(),
        userCount: userCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      database: {
        connected: false,
        error: error.message,
      },
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// start server
const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
module.exports = app;
