import GoogleButton from "./GoogleButton";
import PasswordStrengthIndicator from "./PasswordStrengthIndicator";
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
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState } from "react";
import { signupUser } from "redux/auth/auth.action";
import { AuthSelector } from "redux/auth/auth.selector";
import { clearError } from "redux/auth/auth.slice";
// for password validate
import { validatePassword } from "utils/passwordValidator";

// password validate

interface UserSignupProps {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const UserSignup: React.FC<UserSignupProps> = ({
  open,
  onClose,
  onSwitchToLogin,
}) => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(AuthSelector);
  const { loading, error: reduxError } = auth;

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "", // ← NEW
    lastName: "", // ← NEW
    company: "", // ← NEW
    interests: "", // ← NEW (optional)
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  // add
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleOAuthSignup = (provider: "google" | "orcid") => {
    const apiUrl =
      process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";
    window.location.href = `${apiUrl}/auth/${provider}`;
  };

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

  const validateForm = () => {
    if (
      !formData.username ||
      !formData.email ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.company ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields");
      return false;
    }

    // if (formData.password.length < 8) {
    //   setError("Password must be at least 8 characters long");
    //   return false;
    // }
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    dispatch(clearError());

    if (!validateForm()) {
      return;
    }

    const result = await dispatch(
      signupUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName, // ← NEW
        lastName: formData.lastName, // ← NEW
        company: formData.company, // ← NEW
        interests: formData.interests, // ← NEW
      })
    );
    if (signupUser.fulfilled.match(result)) {
      if (result.payload.requiresVerification) {
        // Traditional signup - show verification message
        setSuccess(true);
        setSuccessMessage(
          result.payload.message ||
            "Registration successful! Please check your email to verify your account."
        );

        // Clear form
        setFormData({
          username: "",
          email: "",
          firstName: "", // ← NEW
          lastName: "", // ← NEW
          company: "", // ← NEW
          interests: "", // ← NEW
          password: "",
          confirmPassword: "",
        });

        // Auto-close after 5 seconds
        setTimeout(() => {
          handleClose();
        }, 5000);
      } else {
        // OAuth signup - user is logged in, close immediately
        handleClose();
      }
    } else {
      // setError(reduxError || "Signup failed. Please try again.");
      setError(
        (result.payload as string) || "Signup failed. Please try again."
      );
    }
  };

  const handleClose = () => {
    setFormData({
      username: "",
      email: "",
      firstName: "", // ← NEW
      lastName: "", // ← NEW
      company: "", // ← NEW
      interests: "", // ← NEW
      password: "",
      confirmPassword: "",
    });
    setError("");
    setSuccess(false); // ← NEW
    setSuccessMessage(""); // ← NEW
    setShowPassword(false);
    setShowConfirmPassword(false);
    dispatch(clearError());
    onClose();
  };

  const handleSwitchToLogin = () => {
    handleClose();
    onSwitchToLogin();
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
          maxHeight: "90vh", // Allow scrolling if content is too tall
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
          <TextField
            fullWidth
            label="Username"
            value={formData.username}
            onChange={handleChange("username")}
            required
            disabled={loading || success} // ← NEW: Disable if success
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
            disabled={loading || success} // ← NEW: Disable if success
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

          {/* First Name - NEW */}
          <TextField
            fullWidth
            label="First Name"
            value={formData.firstName}
            onChange={handleChange("firstName")}
            required
            disabled={loading || success}
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

          {/* Last Name - NEW */}
          <TextField
            fullWidth
            label="Last Name"
            value={formData.lastName}
            onChange={handleChange("lastName")}
            required
            disabled={loading || success}
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

          {/* Institute - NEW */}
          <TextField
            fullWidth
            label="Company/Institute"
            value={formData.company}
            onChange={handleChange("company")}
            required
            disabled={loading || success}
            helperText="Your university, research institution, or company"
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

          {/* Research Interests - NEW (Optional) */}
          <TextField
            fullWidth
            label="Research Interests (Optional)"
            value={formData.interests}
            onChange={handleChange("interests")}
            disabled={loading || success}
            multiline
            rows={2}
            placeholder="e.g., fMRI, EEG, fNIRS, Neuroimaging"
            helperText="What areas of neuroscience research are you interested in?"
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
            disabled={loading || success} // ← NEW: Disable if success
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
          {/*password validate */}
          {formData.password && (
            <PasswordStrengthIndicator password={formData.password} />
          )}
          <TextField
            fullWidth
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange("confirmPassword")}
            required
            disabled={loading || success} // ← NEW: Disable if success
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
              mt: 2,
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

          {/* Success / error alert */}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            // disabled={loading}
            disabled={loading || success} // ← NEW: Disable if success
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
          <Box sx={{ mb: 3 }}>
            <GoogleButton
              //   variant="signup"
              onClick={() => handleOAuthSignup("google")}
              disabled={loading}
            />
            {/* <OAuthButton
    provider="orcid"
    onClick={() => handleOAuthSignup("orcid")}
    disabled={loading}
  /> */}
          </Box>
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
