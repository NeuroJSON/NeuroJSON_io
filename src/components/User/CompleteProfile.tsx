import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const CompleteProfile: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    interests: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    // Try to decode token to pre-fill form (optional)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setFormData((prev) => ({
        ...prev,
        firstName: payload.firstName || "",
        lastName: payload.lastName || "",
      }));
    } catch (e) {
      // Token decode failed, just continue with empty form
    }
  }, [token, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post("/api/v1/auth/complete-profile", {
        token,
        ...formData,
      });

      // Profile completed successfully, redirect to home
      navigate("/?auth=success");
      window.location.reload(); // Reload to update auth state
    } catch (err: unknown) {
      //   setError(err.response?.data?.message || 'Failed to complete profile');
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Failed to complete profile");
      } else {
        setError("Failed to complete profile");
      }
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Complete Your Profile
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3 }}
          align="center"
        >
          Just a few more details to get you started on NeuroJSON.io
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            margin="normal"
            disabled={loading}
            autoFocus
          />

          <TextField
            fullWidth
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            margin="normal"
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Company/Institution"
            name="company"
            value={formData.company}
            onChange={handleChange}
            required
            margin="normal"
            helperText="Your university, research institution, or company"
            disabled={loading}
            placeholder="e.g., MIT, Harvard Medical School, Google Research"
          />

          <TextField
            fullWidth
            label="Research Interests (Optional)"
            name="interests"
            value={formData.interests}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
            helperText="e.g., fMRI, EEG, Machine Learning, Neuroimaging"
            disabled={loading}
            placeholder="What areas of neuroscience research are you interested in?"
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: "block" }}
          >
            ⏱️ Take your time - this session is valid for 1 hour
          </Typography>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ mt: 3 }}
          >
            {loading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1, color: "white" }} />
                Completing Profile...
              </>
            ) : (
              "Complete Profile & Continue"
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CompleteProfile;
