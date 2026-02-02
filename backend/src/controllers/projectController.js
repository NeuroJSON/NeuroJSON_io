const { Project, User } = require("../models");

// Create a new organizer project
const createProject = async (req, res) => {
  try {
    const user = req.user;
    const { name, description } = req.body;

    const project = await Project.create({
      user_id: user.id,
      name: name || `Dataset Project ${new Date().toLocaleDateString()}`,
      description: description || "don't have description yet",
      extractor_state: {
        files: [],
        selectedIds: [],
        expandedIds: [],
      },
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      message: "Error creating project",
      error: error.message,
    });
  }
};

// Get all projects for current user
const getUserProjects = async (req, res) => {
  try {
    const user = req.user;

    const projects = await Project.findAll({
      where: { user_id: user.id },
      order: [["updated_at", "DESC"]],
      attributes: [
        "id",
        "name",
        "description",
        "created_at",
        "updated_at",
        "extractor_state",
      ],
    });

    // Add file count to each project
    const projectsWithCount = projects.map((project) => {
      const state = project.extractor_state || { files: [] };
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        created_at: project.created_at,
        updated_at: project.updated_at,
        file_count: state.files ? state.files.length : 0,
      };
    });

    res.status(200).json({
      projects: projectsWithCount,
      count: projectsWithCount.length,
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      message: "Error fetching projects",
      error: error.message,
    });
  }
};

// Get a specific project
const getProject = async (req, res) => {
  try {
    const user = req.user;
    const { projectId } = req.params;

    const project = await Project.findOne({
      where: {
        id: projectId,
        user_id: user.id,
      },
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    res.status(200).json({ project });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      message: "Error fetching project",
      error: error.message,
    });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const user = req.user;
    const { projectId } = req.params;
    const { name, description, extractor_state } = req.body;

    const project = await Project.findOne({
      where: {
        id: projectId,
        user_id: user.id,
      },
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Update only provided fields
    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (extractor_state !== undefined) {
      project.extractor_state = extractor_state;
      // Mark as changed for JSON field - tells Sequelize to UPDATE this field
      project.changed("extractor_state", true);
    }

    await project.save();

    res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      message: "Error updating project",
      error: error.message,
    });
  }
};
// Delete project
const deleteProject = async (req, res) => {
  try {
    const user = req.user;
    const { projectId } = req.params;

    const project = await Project.findOne({
      where: {
        id: projectId,
        user_id: user.id,
      },
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await project.destroy();

    res.status(200).json({
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      message: "Error deleting project",
      error: error.message,
    });
  }
};

module.exports = {
  createProject,
  getUserProjects,
  getProject,
  updateProject,
  deleteProject,
};
