import ProfileTab from "./Dashboard/ProfileTab";
import SecurityTab from "./Dashboard/SecurityTab";
import { AccountCircle, Lock, Settings } from "@mui/icons-material";
import {
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Typography,
  Avatar,
} from "@mui/material";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState } from "react";
import { AuthSelector } from "redux/auth/auth.selector";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAppSelector(AuthSelector);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Please log in to access your dashboard.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "primary.main",
              fontSize: "2rem",
            }}
          >
            {user.firstName?.[0]?.toUpperCase() ||
              user.username[0].toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.username}
            </Typography>

            <Typography variant="body1" color="text.secondary">
              Email: {user.email}
            </Typography>
            {user.company && (
              <Typography variant="body2" color="text.secondary">
                Institution / Company: {user.company}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Dashboard Content */}
      <Paper sx={{ width: "100%" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="dashboard tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            icon={<AccountCircle />}
            label="Profile"
            id="dashboard-tab-0"
            aria-controls="dashboard-tabpanel-0"
          />
          <Tab
            icon={<Lock />}
            label="Security"
            id="dashboard-tab-1"
            aria-controls="dashboard-tabpanel-1"
          />
          <Tab
            icon={<Settings />}
            label="Settings"
            id="dashboard-tab-2"
            aria-controls="dashboard-tabpanel-2"
          />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <ProfileTab user={user} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <SecurityTab user={user} />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default UserDashboard;
