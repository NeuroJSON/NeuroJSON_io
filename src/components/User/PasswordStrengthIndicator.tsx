import { validatePasswordWithDetails } from "../../utils/passwordValidator";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import { Box, Typography } from "@mui/material";
import React from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  // Use the validator utility to get validation results
  const validation = validatePasswordWithDetails(password);

  // Define rule labels (matches the validation rules)
  const ruleLabels = [
    { key: "minLength", label: "At least 8 characters" },
    { key: "hasUppercase", label: "One uppercase letter (A-Z)" },
    { key: "hasLowercase", label: "One lowercase letter (a-z)" },
    { key: "hasNumber", label: "One number (0-9)" },
    { key: "hasSpecialChar", label: "One special character (!@#$%...)" },
  ];

  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 1, fontWeight: 500 }}
      >
        Password must contain:
      </Typography>
      {ruleLabels.map((rule) => {
        const isMet =
          validation.rules[rule.key as keyof typeof validation.rules];

        return (
          <Box
            key={rule.key}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 0.5,
            }}
          >
            {isMet ? (
              <CheckCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
            ) : (
              <CircleOutlinedIcon
                sx={{ fontSize: 18, color: "text.disabled" }}
              />
            )}
            <Typography
              variant="body2"
              sx={{
                color: isMet ? "success.main" : "text.secondary",
                fontSize: "0.875rem",
              }}
            >
              {rule.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default PasswordStrengthIndicator;
