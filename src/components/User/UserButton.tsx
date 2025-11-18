import {
  AccountCircle, //   Login,
  //   PersonAdd,
  Dashboard,
  Settings,
  ManageAccounts, //   Logout,
} from "@mui/icons-material";
import {
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
}

const UserButton: React.FC<UserButtonProps> = ({
  isLoggedIn,
  userName,
  onLogout,
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
            backgroundColor: Colors.lightBlue,
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
            <MenuItem
              key="login"
              //   onClick={() => handleMenuItemClick(RoutesEnum.LOGIN)}
            >
              {/* <ListItemIcon>
                <Login sx={{ color: Colors.yellow }} />
              </ListItemIcon> */}
              <ListItemText>Sign In</ListItemText>
            </MenuItem>

            <MenuItem
              key="signup"
              //   onClick={() => handleMenuItemClick(RoutesEnum.SIGNUP)}
            >
              {/* <ListItemIcon>
                <PersonAdd sx={{ color: Colors.yellow }} />
              </ListItemIcon> */}
              <ListItemText>Create Account</ListItemText>
            </MenuItem>
          </>
        ) : (
          // menu for lonin user
          <>
            {userName && (
              <>
                <MenuItem
                  key="username"
                  disabled
                  sx={{
                    opacity: "1 !important",
                    cursor: "default !important",
                    "&:hover": {
                      backgroundColor: "transparent !important",
                    },
                  }}
                >
                  <ListItemText
                    primary={userName}
                    primaryTypographyProps={{
                      fontWeight: 600,
                      color: Colors.purple,
                    }}
                  />
                </MenuItem>
                <Divider
                  sx={{ my: 1, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                />
              </>
            )}
            <MenuItem
            // onClick={() => handleMenuItemClick(RoutesEnum.DASHBOARD)}
            >
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

            <MenuItem
            // onClick={() => handleMenuItemClick(RoutesEnum.USER_MANAGEMENT)}
            >
              <ListItemIcon>
                <ManageAccounts sx={{ color: Colors.darkPurple }} />
              </ListItemIcon>
              <ListItemText>User Management</ListItemText>
            </MenuItem>

            <Divider
              sx={{ my: 1, backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            />

            <MenuItem
            // onClick={handleLogout}
            >
              {/* <ListItemIcon>
                <Logout sx={{ color: Colors.yellow }} />
              </ListItemIcon> */}
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default UserButton;
