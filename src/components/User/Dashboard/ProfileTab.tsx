import {
  Email,
  Person,
  Business,
  CalendarToday,
  Verified,
} from "@mui/icons-material";
import { Box, Typography, Grid, Paper, Chip, Divider } from "@mui/material";
import React from "react";

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
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Profile Information
      </Typography>

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
          {user.firstName && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                First Name
              </Typography>
              <Typography variant="body1">{user.firstName}</Typography>
            </Grid>
          )}

          {/* Last Name */}
          {user.lastName && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                Last Name
              </Typography>
              <Typography variant="body1">{user.lastName}</Typography>
            </Grid>
          )}

          {/* Company */}
          {user.company && (
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
          )}

          {/* Interests */}
          {user.interests && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Research Interests
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                {user.interests}
              </Typography>
            </Grid>
          )}

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

      {/* Note about editing */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 2 }}
      >
        To update your profile information, please contact support.
      </Typography>
    </Box>
  );
};

export default ProfileTab;
