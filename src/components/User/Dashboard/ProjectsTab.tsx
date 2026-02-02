// src/components/Dashboard/ProjectsTab.tsx
import { FolderOpen, Add, Delete, Edit, Visibility } from "@mui/icons-material";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUserProjects,
  createProject,
  deleteProject,
  updateProject,
} from "redux/projects/projects.action";
import {
  selectUserProjects,
  selectProjectsLoading,
  selectProjectsError,
  selectIsCreatingProject,
} from "redux/projects/projects.selector";

interface ProjectsTabProps {
  userId: number;
}

const ProjectsTab: React.FC<ProjectsTabProps> = ({ userId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const projects = useAppSelector(selectUserProjects);
  const loading = useAppSelector(selectProjectsLoading);
  const error = useAppSelector(selectProjectsError);
  const isCreating = useAppSelector(selectIsCreatingProject);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{
    id: number;
    name: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    dispatch(getUserProjects());
  }, [dispatch]);

  const handleViewProject = (projectId: number) => {
    navigate(`/projects/${projectId}`);
  };

  const handleCreateOpen = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setNewProjectName("");
    setNewProjectDescription("");
    setCreateDialogOpen(false);
  };

  const handleCreateSubmit = async () => {
    if (!newProjectName.trim()) return;

    try {
      await dispatch(
        createProject({
          name: newProjectName.trim(),
          description: newProjectDescription.trim() || undefined,
        })
      ).unwrap();

      handleCreateClose();
      // Refetch projects after create
      dispatch(getUserProjects());
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleDeleteClick = (projectId: number, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    try {
      await dispatch(deleteProject({ projectId: projectToDelete.id })).unwrap();
      setDeleteDialogOpen(false);
      setProjectToDelete(null);

      // Refetch projects after delete
      dispatch(getUserProjects());
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleEditClick = (project: any) => {
    setEditingProject({
      id: project.id,
      name: project.name,
      description: project.description || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingProject || !editingProject.name.trim()) return;

    try {
      await dispatch(
        updateProject({
          projectId: editingProject.id,
          name: editingProject.name.trim(),
          description: editingProject.description.trim() || undefined,
        })
      ).unwrap();

      // Refetch projects
      dispatch(getUserProjects());

      handleEditClose();
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingProject(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && projects.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header with Create Button */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            Dataset Organizer Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organize and convert your neuroimaging datasets to BIDS format
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateOpen}
          sx={{
            background: `linear-gradient(
              135deg,
              ${Colors.purple} 0%,
              ${Colors.secondaryPurple} 100%
            )`,
            color: "#fff",
            textTransform: "none",
            "&:hover": {
              background: `linear-gradient(
                135deg,
                ${Colors.secondaryPurple} 0%,
                ${Colors.purple} 100%
              )`,
            },
          }}
        >
          New Project
        </Button>
      </Box>

      {/* Empty State */}
      {projects.length === 0 ? (
        <Box textAlign="center" py={6}>
          <FolderOpen sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Projects Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create a project to start organizing your neuroimaging datasets
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateOpen}
            sx={{
              backgroundColor: Colors.purple,
              "&:hover": { backgroundColor: Colors.secondaryPurple },
            }}
          >
            Create Your First Project
          </Button>
        </Box>
      ) : (
        // Projects List
        <Paper variant="outlined">
          <List>
            {projects.map((project, index) => (
              <React.Fragment key={project.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    py: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    "&:hover": {
                      backgroundColor: "rgba(128, 90, 213, 0.05)",
                    },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <FolderOpen
                            sx={{ color: Colors.darkGreen, fontSize: 20 }}
                          />
                          <Typography variant="subtitle1" fontWeight="medium">
                            {project.name}
                          </Typography>
                          <Chip
                            label={`${project.file_count || 0} ${
                              project.file_count === 1 ? "file" : "files"
                            }`}
                            size="small"
                            sx={{ height: 20 }}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          {project.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {project.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Created {formatDate(project.created_at)}
                          </Typography>
                        </>
                      }
                    />
                  </Box>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(project)}
                      sx={{
                        color: Colors.purple,
                        "&:hover": {
                          backgroundColor: "rgba(128, 90, 213, 0.1)",
                        },
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewProject(project.id)}
                      sx={{
                        color: Colors.purple,
                        borderColor: Colors.purple,
                        "&:hover": {
                          borderColor: Colors.secondaryPurple,
                          backgroundColor: "rgba(128, 90, 213, 0.1)",
                        },
                      }}
                    >
                      Open
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleDeleteClick(project.id, project.name)
                      }
                      sx={{
                        color: Colors.rose,
                        "&:hover": {
                          backgroundColor: "rgba(211, 47, 47, 0.1)",
                        },
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Create Project Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCreateClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: Colors.darkPurple }}>
          Create New Project
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{
              mb: 2,
              mt: 1,
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            sx={{
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCreateClose}
            sx={{
              color: Colors.purple,
              "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.08)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!newProjectName.trim() || isCreating}
            sx={{
              background: `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`,
              color: "#fff",
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`,
              },
              "&.Mui-disabled": {
                background: "linear-gradient(135deg, #e0e0e0 0%, #cfcfcf 100%)",
                color: "#9e9e9e",
                cursor: "not-allowed",
                boxShadow: "none",
              },
            }}
          >
            {isCreating ? <CircularProgress size={20} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle sx={{ color: Colors.darkPurple }}>
          Delete Project?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{projectToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will permanently delete the project and all its data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              color: Colors.purple,
              "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.08)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            disabled={loading}
            sx={{
              background: `linear-gradient(
                135deg,
                ${Colors.rose} 0%,
                ${Colors.purple} 100%
              )`,
              color: "#fff",
              textTransform: "none",
              "&:hover": {
                background: `linear-gradient(
                  135deg,
                  ${Colors.purple} 0%,
                  ${Colors.rose} 100%
                )`,
              },
            }}
          >
            {loading ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: Colors.darkPurple }}>
          Edit Project
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={editingProject?.name || ""}
            onChange={(e) =>
              setEditingProject(
                editingProject
                  ? { ...editingProject, name: e.target.value }
                  : null
              )
            }
            sx={{
              mb: 2,
              mt: 1,
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={editingProject?.description || ""}
            onChange={(e) =>
              setEditingProject(
                editingProject
                  ? { ...editingProject, description: e.target.value }
                  : null
              )
            }
            sx={{
              mb: 2,
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleEditClose}
            sx={{
              color: Colors.purple,
              "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.08)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!editingProject?.name.trim() || loading}
            sx={{
              background: `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`,
              color: "#fff",
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`,
              },
              "&.Mui-disabled": {
                background: "linear-gradient(135deg, #e0e0e0 0%, #cfcfcf 100%)",
                color: "#9e9e9e",
                cursor: "not-allowed",
                boxShadow: "none",
              },
            }}
          >
            {loading ? <CircularProgress size={20} /> : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsTab;
