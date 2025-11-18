import { Close, Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  Alert,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useState } from "react";

interface UserSignupProps {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSignupSuccess: (userName: string) => void;
}

const UserSignup: React.FC<UserSignupProps> = ({
  open,
  onClose,
  onSwitchToLogin,
  onSignupSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

  const validateForm = () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleClose = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  const handleSwitchToLogin = () => {
    handleClose();
    onSwitchToLogin();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // TODO: Replace with your actual API call
      // const response = await authService.signup(formData);

      // Mock API call (remove this in production)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful signup
      onSignupSuccess(formData.name);
      handleClose();
    } catch (error) {
      setError("An error occurred during signup. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: Colors.white,
          color: Colors.darkPurple,
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Create Account
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{
            color: Colors.darkPurple,
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Username"
            value={formData.name}
            onChange={handleChange("name")}
            required
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                color: Colors.darkPurple,
                "& fieldset": { borderColor: Colors.primary.light },
                "&:hover fieldset": { borderColor: Colors.purple },
                "&.Mui-focused fieldset": { borderColor: Colors.purple },
              },
              "& .MuiInputLabel-root": {
                color: Colors.primary.light,
                "&.Mui-focused": { color: Colors.purple },
              },
            }}
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange("email")}
            required
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                color: Colors.darkPurple,
                "& fieldset": { borderColor: Colors.primary.light },
                "&:hover fieldset": { borderColor: Colors.purple },
                "&.Mui-focused fieldset": { borderColor: Colors.purple },
              },
              "& .MuiInputLabel-root": {
                color: Colors.primary.light,
                "&.Mui-focused": { color: Colors.purple },
              },
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange("password")}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: Colors.primary.light }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                color: Colors.darkPurple,
                "& fieldset": { borderColor: Colors.primary.light },
                "&:hover fieldset": { borderColor: Colors.purple },
                "&.Mui-focused fieldset": { borderColor: Colors.purple },
              },
              "& .MuiInputLabel-root": {
                color: Colors.primary.light,
                "&.Mui-focused": { color: Colors.purple },
              },
            }}
          />
          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange("confirmPassword")}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    sx={{ color: Colors.primary.light }}
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                color: Colors.darkPurple,
                "& fieldset": { borderColor: Colors.primary.light },
                "&:hover fieldset": { borderColor: Colors.purple },
                "&.Mui-focused fieldset": { borderColor: Colors.purple },
              },
              "& .MuiInputLabel-root": {
                color: Colors.primary.light,
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
                opacity: 0.9,
              },
              "&:disabled": {
                backgroundColor: Colors.lightGray,
                color: Colors.white,
              },
            }}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color={Colors.primary.light}>
              Already have an account?{" "}
              <Typography
                component="span"
                sx={{
                  color: Colors.purple,
                  cursor: "pointer",
                  fontWeight: 600,
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={handleSwitchToLogin}
              >
                Sign In
              </Typography>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default UserSignup;
