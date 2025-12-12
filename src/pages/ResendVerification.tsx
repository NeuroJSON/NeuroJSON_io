import { Email } from "@mui/icons-material";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const ResendVerification: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_API_URL || "http://localhost:5000"
        }/api/v1/auth/resend-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setEmail("");
      } else {
        setError(data.message || "Failed to send verification email");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            borderRadius: 2,
            width: "100%",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Email sx={{ fontSize: 60, color: Colors.purple, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Resend Verification Email
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Enter your email address and we'll send you a new verification
              link.
            </Typography>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Verification email sent! Please check your inbox and spam folder.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: Colors.primary.light },
                  "&:hover fieldset": { borderColor: Colors.purple },
                  "&.Mui-focused fieldset": { borderColor: Colors.purple },
                },
                "& .MuiInputLabel-root": {
                  "&.Mui-focused": { color: Colors.purple },
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                backgroundColor: Colors.purple,
                color: Colors.white,
                fontWeight: 600,
                py: 1.5,
                mb: 2,
                "&:hover": {
                  backgroundColor: Colors.secondaryPurple,
                },
                "&:disabled": {
                  backgroundColor: Colors.lightGray,
                },
              }}
            >
              {loading ? "Sending..." : "Send Verification Email"}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigate("/")}
              sx={{
                borderColor: Colors.purple,
                color: Colors.purple,
                "&:hover": {
                  borderColor: Colors.secondaryPurple,
                  backgroundColor: "rgba(102, 126, 234, 0.1)",
                },
              }}
            >
              Back to Home
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ResendVerification;
