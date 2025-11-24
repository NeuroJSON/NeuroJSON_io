import { Box } from "@mui/material";
import React from "react";

interface OAuthButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: "signin" | "signup";
}

const GoogleButton: React.FC<OAuthButtonProps> = ({
  onClick,
  disabled = false,
  variant = "signin",
}) => {
  const imageSrc =
    variant === "signin"
      ? "/img/user/web_light_sq_SI@2x.png"
      : "/img/user/web_light_sq_SU@2x.png";

  return (
    <Box
      component="img"
      src={imageSrc}
      alt={variant === "signin" ? "Sign in with Google" : "Sign up with Google"}
      onClick={disabled ? undefined : onClick}
      sx={{
        width: "100%",
        height: "48px",
        objectFit: "contain",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.2s, transform 0.1s",
        "&:hover": {
          opacity: disabled ? 0.5 : 0.9,
          transform: disabled ? "none" : "translateY(-1px)",
        },
        "&:active": {
          transform: disabled ? "none" : "translateY(0)",
        },
        mb: 1.5,
        borderRadius: "4px",
        display: "block",
      }}
    />
  );
};

export default GoogleButton;
