import {
  AccountCircle,
  Dashboard,
  Settings,
  ManageAccounts,
  Logout,
} from "@mui/icons-material";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Colors } from "design/theme";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

interface UserButtonProps {
  isLoggedIn: boolean;
  userName?: string;
  onLogout?: () => void;
  onOpenLogin: () => void;
  onOpenSignup: () => void;
}

const UserButton: React.FC<UserButtonProps> = ({
  isLoggedIn,
  userName,
  onLogout,
  onOpenLogin,
  onOpenSignup,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (path: string) => {
    handleClose();
    navigate(path);
  };

  const handleLogout = () => {
    handleClose();
    if (onLogout) {
      onLogout();
    }
  };

  const handleLogin = () => {
    handleClose();
    onOpenLogin();
  };

  const handleSignup = () => {
    handleClose();
    onOpenSignup();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{
          color: Colors.white,
          transition: "transform 0.3s ease",
          "&:hover": {
            transform: "scale(1.1)",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <AccountCircle sx={{ fontSize: 32 }} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            backgroundColor: Colors.white,
            color: Colors.darkPurple,
            minWidth: 200,
            mt: 1.5,
            borderRadius: 2,
            boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
            "& .MuiMenuItem-root": {
              px: 2.5,
              py: 1.4,
              fontSize: "0.95rem",
              fontWeight: 500,
              transition: "all 0.2s ease",
              //   transition: "background-color 0.2s ease, transform 0.2s ease",
              "& .MuiMenuItem-root:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                transform: "translateX(2px)",
                color: Colors.white,
              },
              //   "&:hover": {
              //     backgroundColor: "rgba(255, 255, 255, 0.12)",
              //     color: Colors.white,
              //     transform: "translateX(2px)",
              //   },
              //   "& .MuiDivider-root": {
              //     backgroundColor: "rgba(255,255,255,0.15)",
              //   },
            },
          },
        }}
      >
        {!isLoggedIn ? (
          <>
            <MenuItem key="login" onClick={handleLogin}>
              <ListItemText>Sign In</ListItemText>
            </MenuItem>
            <Divider
              sx={{ my: 1, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            />
            <MenuItem key="signup" onClick={handleSignup}>
              <ListItemText>Create Account</ListItemText>
            </MenuItem>
          </>
        ) : (
          // menu for lonin user
          <>
            {userName && (
              <>
                <Box
                  sx={{
                    px: 2.5,
                    py: 2,
                    color: Colors.purple,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: "1rem",
                      opacity: 0.9,
                      display: "block",
                      mb: 0.5,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Welcome,
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: "1rem",
                      color: Colors.purple,
                    }}
                  >
                    {userName}
                  </Typography>
                </Box>
                <Divider
                  sx={{ my: 1, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                />
              </>
            )}
            <MenuItem onClick={() => handleMenuItemClick(RoutesEnum.DASHBOARD)}>
              <ListItemIcon>
                <Dashboard sx={{ color: Colors.darkPurple }} />
              </ListItemIcon>
              <ListItemText>Dashboard</ListItemText>
            </MenuItem>

            <MenuItem
            // onClick={() => handleMenuItemClick(RoutesEnum.SETTINGS)}
            >
              <ListItemIcon>
                <Settings sx={{ color: Colors.darkPurple }} />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>

            {/* <MenuItem
            onClick={() => handleMenuItemClick(RoutesEnum.USER_MANAGEMENT)}
            >
              <ListItemIcon>
                <ManageAccounts sx={{ color: Colors.darkPurple }} />
              </ListItemIcon>
              <ListItemText>User Management</ListItemText>
            </MenuItem> */}

            <Divider
              sx={{ my: 1, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            />

            <MenuItem onClick={handleLogout}>
              <ListItemText>Logout</ListItemText>
              <ListItemIcon>
                <Logout />
              </ListItemIcon>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default UserButton;
