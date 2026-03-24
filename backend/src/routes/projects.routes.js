const express = require("express");
const {
  getUserProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");
const { restoreUser, requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Apply restoreUser to all routes
router.use(restoreUser);

// Get all user's projects
router.get("/me/projects", requireAuth, getUserProjects);

// Create new project
router.post("/", requireAuth, createProject);

// Get specific project
router.get("/:projectId", requireAuth, getProject);

// Update project
router.put("/:projectId", requireAuth, updateProject);

// Delete project
router.delete("/:projectId", requireAuth, deleteProject);

module.exports = router;
