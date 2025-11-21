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
        maxWidth: "382px",
        height: "auto",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.2s",
        "&:hover": {
          opacity: disabled ? 0.5 : 0.9,
        },
        mb: 1.5,
      }}
    />
  );
};

export default GoogleButton;
