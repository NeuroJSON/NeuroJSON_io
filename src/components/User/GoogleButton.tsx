import { Box, Button } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

interface GoogleButtonProps {
  onClick: () => void;
  disabled?: boolean;
  //   variant?: "signin" | "signup";
}

const GoogleButton: React.FC<GoogleButtonProps> = ({
  onClick,
  disabled = false,
  //   variant = "signin",
}) => {
  return (
    <Button
      fullWidth
      onClick={onClick}
      disabled={disabled}
      sx={{
        backgroundColor: Colors.white,
        color: Colors.darkPurple,
        fontWeight: 600,
        py: 1.5,
        mb: 1.5,
        border: "1px solid #dadce0",
        textTransform: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        "&:hover": {
          backgroundColor: "#f5f5f5",
        },
        "&:disabled": {
          backgroundColor: Colors.lightGray,
          color: Colors.white,
          opacity: 0.5,
        },
      }}
    >
      {/* Google Logo */}
      <Box
        component="img"
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google"
        sx={{
          width: "20px", // logo size
          height: "20px",
        }}
      />
      Continue with Google
    </Button>
  );
};

export default GoogleButton;
