import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link as MuiLink,
} from "@mui/material";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "redux/auth/auth.action";

const ForgotPassword: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      await dispatch(forgotPassword({ email })).unwrap();
      setSuccess(true);
      setEmail("");
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Forgot Password
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3 }}
          align="center"
        >
          Enter your email address and we'll send you a link to reset your
          password.
        </Typography>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            If an account with that email exists, a password reset link has been
            sent. Please check your email (and spam folder).
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
            disabled={loading || success}
            sx={{ mb: 3 }}
            placeholder="your.email@example.com"
          />

          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={loading || success}
            sx={{ mb: 2, py: 1.5 }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>

          <Box sx={{ textAlign: "center" }}>
            <MuiLink component={Link} to="/" variant="body2">
              ← Back to Login
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ForgotPassword;
