import {
  Email,
  Person,
  Business,
  CalendarToday,
  Verified,
  Edit,
  Save,
  Cancel,
} from "@mui/icons-material";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Chip,
  Divider,
  Button,
  TextField,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState } from "react";
import { updateProfile } from "redux/auth/auth.action";
import { AuthSelector } from "redux/auth/auth.selector";

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  interests?: string;
  email_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

interface ProfileTabProps {
  user: User;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ user }) => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(AuthSelector);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    company: user.company || "",
    interests: user.interests || "",
  });
  const [successMessage, setSuccessMessage] = useState("");

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSuccessMessage("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      company: user.company || "",
      interests: user.interests || "",
    });
    setSuccessMessage("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    try {
      await dispatch(updateProfile(editData)).unwrap();
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <Box>
      {/* <Typography variant="h6" gutterBottom>
        Profile Information
      </Typography> */}
      {/* ✅ ADD: Header with Edit Button */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Profile Information</Typography>
        {!isEditing ? (
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEdit}
            sx={{
              color: Colors.purple,
              borderColor: Colors.purple,
              "&:hover": {
                borderColor: Colors.secondaryPurple,
                backgroundColor: "rgba(128, 90, 213, 0.1)",
              },
            }}
          >
            Edit Profile
          </Button>
        ) : (
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              onClick={handleCancel}
              disabled={loading}
              sx={{
                color: "#6366f1",
                borderColor: "#6366f1",
                "&:hover": {
                  borderColor: "#4f46e5",
                  backgroundColor: "rgba(99, 102, 241, 0.1)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <Save />}
              onClick={handleSave}
              disabled={
                loading ||
                !editData.firstName.trim() ||
                !editData.lastName.trim() ||
                !editData.company.trim()
              }
              sx={{
                background: `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`,
                color: "#fff",
                "&:hover": {
                  background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`,
                },
              }}
            >
              Save Changes
            </Button>
          </Box>
        )}
      </Box>

      {/* ✅ ADD: Success Message */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* ✅ ADD: Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, mt: 2 }}>
        <Grid container spacing={3}>
          {/* Username */}
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <Person color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Username
                </Typography>
                <Typography variant="body1">{user.username}</Typography>
              </Box>
            </Box>
          </Grid>

          {/* Email */}
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <Email color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1">{user.email}</Typography>
                  {user.email_verified && (
                    <Chip
                      icon={<Verified />}
                      label="Verified"
                      size="small"
                      color="success"
                      sx={{ height: 20 }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* First Name */}
          {/* {user.firstName && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                First Name
              </Typography>
              <Typography variant="body1">{user.firstName}</Typography>
            </Grid>
          )} */}

          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              First Name
            </Typography>
            {isEditing ? (
              <TextField
                fullWidth
                name="firstName"
                value={editData.firstName}
                onChange={handleChange}
                size="small"
                required
                sx={{
                  mt: 0.5,
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: Colors.purple,
                    },
                  },
                }}
              />
            ) : (
              <Typography variant="body1">{user.firstName}</Typography>
            )}
          </Grid>
          {/* Last Name */}
          {/* {user.lastName && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Last Name
              </Typography>
              <Typography variant="body1">{user.lastName}</Typography>
            </Grid>
          )} */}
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              Last Name
            </Typography>
            {isEditing ? (
              <TextField
                fullWidth
                name="lastName"
                value={editData.lastName}
                onChange={handleChange}
                size="small"
                required
                sx={{
                  mt: 0.5,
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: Colors.purple,
                    },
                  },
                }}
              />
            ) : (
              <Typography variant="body1">{user.lastName}</Typography>
            )}
          </Grid>

          {/* Company */}
          {/* {user.company && (
            <Grid item xs={12}>
              <Box display="flex" alignItems="center" gap={1}>
                <Business color="action" />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Company/Institution
                  </Typography>
                  <Typography variant="body1">{user.company}</Typography>
                </Box>
              </Box>
            </Grid>
          )} */}
          <Grid item xs={12}>
            <Box display="flex" alignItems="center" gap={1}>
              <Business color="action" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Company/Institution
                </Typography>
                {isEditing ? (
                  <TextField
                    fullWidth
                    name="company"
                    value={editData.company}
                    onChange={handleChange}
                    size="small"
                    required
                    sx={{
                      mt: 0.5,
                      "& .MuiOutlinedInput-root": {
                        "&.Mui-focused fieldset": {
                          borderColor: Colors.purple,
                        },
                      },
                    }}
                  />
                ) : (
                  <Typography variant="body1">{user.company}</Typography>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Interests */}
          {/* {user.interests && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Research Interests
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {user.interests}
              </Typography>
            </Grid>
          )} */}

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Research Interests
            </Typography>
            {isEditing ? (
              <TextField
                fullWidth
                name="interests"
                value={editData.interests}
                onChange={handleChange}
                multiline
                rows={3}
                placeholder="e.g., fMRI, EEG, fNIRS, Neuroimaging"
                sx={{
                  mt: 0.5,
                  "& .MuiOutlinedInput-root": {
                    "&.Mui-focused fieldset": {
                      borderColor: Colors.purple,
                    },
                  },
                }}
              />
            ) : (
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {user.interests || "Not specified"}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12}>
            <Divider />
          </Grid>

          {/* Account Created */}
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarToday color="action" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Member Since
                </Typography>
                <Typography variant="body1">
                  {formatDate(user.created_at)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Last Updated */}
          {user.updated_at && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {formatDate(user.updated_at)}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
};

export default ProfileTab;
