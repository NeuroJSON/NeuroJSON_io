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

interface UserLoginProps {
  open: boolean;
  onClose: () => void;
  onSwitchToSignup: () => void;
  onLoginSuccess: (userName: string) => void;
}

const UserLogin: React.FC<UserLoginProps> = ({
  open,
  onClose,
  onSwitchToSignup,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // TODO: Replace with your actual API call
      // const response = await authService.login(email, password);

      // Mock API call (remove this in production)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful login
      if (email && password) {
        onLoginSuccess("John Doe"); // Replace with actual user data from API
        handleClose();
      } else {
        setError("Please enter both email and password");
      }
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setError("");
    setShowPassword(false);
    onClose();
  };

  const handleSwitchToSignup = () => {
    handleClose();
    onSwitchToSignup();
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
          Sign In
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
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              mb: 3,
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
            {loading ? "Sign In..." : "Sign In"}
          </Button>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color={Colors.primary.light}>
              Don't have an account?{" "}
              <Typography
                component="span"
                sx={{
                  color: Colors.purple,
                  cursor: "pointer",
                  fontWeight: 600,
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={handleSwitchToSignup}
              >
                Create Account
              </Typography>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default UserLogin;
