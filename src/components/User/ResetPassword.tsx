import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
import { Visibility, VisibilityOff, CheckCircle } from "@mui/icons-material";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "redux/auth/auth.action";
import { validatePassword } from "utils/passwordValidator";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { loading } = useAppSelector((state) => state.auth);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(3);

  // Check token on mount
  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  // Countdown and redirect after success
  useEffect(() => {
    if (success && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate("/?login=true");
    }
  }, [success, countdown, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    // if (password.length < 8) {
    //   setError("Password must be at least 8 characters long");
    //   return;
    // }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    try {
      await dispatch(resetPassword({ token, password })).unwrap();
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Reset Password
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3 }}
          align="center"
        >
          Enter your new password below.
        </Typography>

        {success && (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            icon={<CheckCircle fontSize="inherit" />}
          >
            <Typography variant="body2" fontWeight="bold">
              Password reset successful!
            </Typography>
            <Typography variant="body2">
              Redirecting to login in {countdown} seconds...
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {token && !success && (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: Colors.purple,
                  },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: Colors.purple,
                },
                "& .MuiInputBase-input": {
                  caretColor: Colors.purple,
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* PASSWORD STRENGTH INDICATOR */}
            {password && (
              <Box sx={{ mb: 2 }}>
                <PasswordStrengthIndicator password={password} />
              </Box>
            )}

            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                  {
                    borderColor: Colors.purple,
                  },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: Colors.purple,
                },
                "& .MuiInputBase-input": {
                  caretColor: Colors.purple,
                },
              }}
              error={confirmPassword.length > 0 && password !== confirmPassword}
              helperText={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? "Passwords do not match"
                  : ""
              }
            />

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{
                py: 1.5,
                backgroundColor: Colors.purple,
                "&:hover": {
                  backgroundColor: Colors.secondaryPurple,
                },
              }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </Box>
        )}

        {success && (
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate("/?login=true")}
              sx={{
                py: 1.5,
                color: Colors.purple,
                borderColor: Colors.purple,
                "&:hover": {
                  borderColor: Colors.secondaryPurple,
                  color: Colors.secondaryPurple,
                },
              }}
            >
              Go to Login Now
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ResetPassword;
