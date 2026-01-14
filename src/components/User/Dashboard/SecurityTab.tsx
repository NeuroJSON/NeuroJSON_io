import { User } from "../../../redux/auth/types/auth.interface";
import PasswordStrengthIndicator from "../PasswordStrengthIndicator";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  InputAdornment,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import React, { useState } from "react";
import { changePassword } from "redux/auth/auth.action";
import { validatePassword } from "utils/passwordValidator";

interface SecurityTabProps {
  user: User;
}

const SecurityTab: React.FC<SecurityTabProps> = ({ user }) => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});
  const isOAuthOnly = user.isOAuthUser && !user.hasPassword;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setError(null);
    setSuccess(null);
  };

  const toggleShowPassword = (field: "current" | "new" | "confirm") => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    // if (!formData.newPassword) {
    //   errors.newPassword = "New password is required";
    // } else if (formData.newPassword.length < 8) {
    //   errors.newPassword = "Password must be at least 8 characters long";
    // }
    if (!formData.newPassword) {
      errors.newPassword = "New password is required";
    } else {
      // password validator
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        errors.newPassword = passwordValidation.message;
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await dispatch(
        changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        })
      ).unwrap();

      setSuccess(result || "Password changed successfully!");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: any) {
      setError(err || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  // If OAuth user, show different message
  if (isOAuthOnly) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Security Settings
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          You're using OAuth login (Google/GitHub/ORCID). Password management is
          handled by your OAuth provider.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Change Password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Update your password to keep your account secure
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <TextField
            fullWidth
            label="Current Password"
            name="currentPassword"
            type={showPasswords.current ? "text" : "password"}
            value={formData.currentPassword}
            onChange={handleChange}
            error={!!validationErrors.currentPassword}
            helperText={validationErrors.currentPassword}
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
                    onClick={() => toggleShowPassword("current")}
                    edge="end"
                  >
                    {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* New Password */}
          <TextField
            fullWidth
            label="New Password"
            name="newPassword"
            type={showPasswords.new ? "text" : "password"}
            value={formData.newPassword}
            onChange={handleChange}
            error={!!validationErrors.newPassword}
            // helperText={validationErrors.newPassword}
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
                    onClick={() => toggleShowPassword("new")}
                    edge="end"
                  >
                    {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* ADD PASSWORD STRENGTH INDICATOR */}
          {formData.newPassword && (
            <Box sx={{ mb: 2 }}>
              <PasswordStrengthIndicator password={formData.newPassword} />
            </Box>
          )}

          {/* Confirm Password */}
          <TextField
            fullWidth
            label="Confirm New Password"
            name="confirmPassword"
            type={showPasswords.confirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            error={!!validationErrors.confirmPassword}
            helperText={validationErrors.confirmPassword}
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => toggleShowPassword("confirm")}
                    edge="end"
                  >
                    {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              backgroundColor: Colors.purple,
              "&:hover": {
                backgroundColor: Colors.secondaryPurple,
              },
            }}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
};

export default SecurityTab;
