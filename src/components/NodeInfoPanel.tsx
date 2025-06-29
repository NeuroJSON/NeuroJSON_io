import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import { NodeObject } from "modules/universe/NeuroJsonGraph";
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDbInfo } from "redux/neurojson/neurojson.action";
import { RootState } from "redux/store";
import RoutesEnum from "types/routes.enum";

interface NodeInfoPanelProps {
  open: boolean;
  onClose: () => void;
  nodeData: NodeObject | null;
}

// covert the database size format
const formatSize = (bytes?: number): string => {
  if (bytes === undefined) return "N/A";
  if (bytes >= 1_073_741_824) {
    return `${Math.floor(bytes / 1_073_741_824)} Gb`;
  } else if (bytes >= 1_048_576) {
    return `${Math.floor(bytes / 1_048_576)} Mb`;
  } else if (bytes >= 1024) {
    return `${Math.floor(bytes / 1024)} Kb`;
  } else {
    return `${bytes} Bytes`;
  }
};

// convert the date format
const dateCoverter = (date?: string): string => {
  if (date === undefined) return "N/A";
  const newDate = new Date(Number(date) * 1000);
  const result = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).format(newDate);
  return result;
};

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({
  open,
  onClose,
  nodeData,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const dbInfo = useAppSelector((state: RootState) => state.neurojson.dbInfo);

  useEffect(() => {
    if (nodeData?.id) {
      dispatch(fetchDbInfo(nodeData.id.toLowerCase()));
    }
  }, [nodeData, dispatch]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }} // Keeps Drawer in DOM even when closed
      disableEnforceFocus //  prevents MUI from trapping focus inside the drawer
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 10,
        "& .MuiDrawer-paper": {
          width: { xs: "100%", sm: "40%", md: "30%" },
          padding: "1rem",
          boxShadow: `0px 0px 15px ${Colors.lightGray}`,
          backgroundColor: "rgba(97, 109, 243, 0.1)",
          backdropFilter: "blur(15px)",
        },
      }}
    >
      <Box>
        {nodeData ? (
          <>
            {/* Close Button */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              paddingLeft={2}
              marginBottom={2}
            >
              <Typography
                variant="h6"
                sx={{ color: Colors.yellow, fontWeight: "Bold" }}
              >
                {nodeData.name}
              </Typography>
              <IconButton onClick={onClose} sx={{ color: Colors.lightGray }}>
                <CloseIcon />
              </IconButton>
            </Box>
            {/* Node Metadata */}
            <Grid container spacing={2} sx={{ pl: 2 }}>
              <Grid item xs={12}>
                <Typography
                  sx={{
                    color: Colors.green,
                    fontWeight: "Bold",
                  }}
                >
                  Website
                </Typography>
                <Typography
                  component="a"
                  href={nodeData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    display: "block",
                    color: Colors.lightGray,
                    textDecoration: "none",
                    wordBreak: "break-word",
                    ":hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  {nodeData.url}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography sx={{ color: Colors.green, fontWeight: "Bold" }}>
                  Number of Datasets
                </Typography>
                <Typography sx={{ color: Colors.lightGray }}>
                  {nodeData.datasets}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography sx={{ color: Colors.green, fontWeight: "Bold" }}>
                  Data Types
                </Typography>
                <Typography sx={{ color: Colors.lightGray }}>
                  {nodeData.datatype.join(", ")}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography sx={{ color: Colors.green, fontWeight: "Bold" }}>
                  Data Standards
                </Typography>
                <Typography sx={{ color: Colors.lightGray }}>
                  {nodeData.standard.join(", ")}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography sx={{ color: Colors.green, fontWeight: "Bold" }}>
                  Upstream Contact
                </Typography>
                <Typography
                  component="a"
                  href={`mailto:${nodeData.support}`}
                  sx={{
                    color: Colors.lightGray,
                    textDecoration: "none",
                    wordBreak: "break-word",
                    ":hover": {
                      textDecoration: "underline",
                    },
                    display: "block",
                  }}
                >
                  {nodeData.support}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography sx={{ color: Colors.green, fontWeight: "Bold" }}>
                  NeuroJSON-Cuated Datasets
                </Typography>
                {dbInfo ? (
                  <Typography sx={{ color: Colors.lightGray }}>
                    {dbInfo.doc_count - 1}
                  </Typography>
                ) : (
                  "Coming soon "
                )}
              </Grid>
            </Grid>
            {/*database info card*/}
            {dbInfo ? (
              <Card sx={{ mt: 2, backgroundColor: Colors.white }}>
                <CardContent>
                  <Grid container spacing={1}>
                    <Grid item xs={12}>
                      <Typography
                        sx={{ color: Colors.darkPurple, fontWeight: "Bold" }}
                      >
                        NeuroJSON.io Database Name
                      </Typography>
                      <Typography>{dbInfo.db_name}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        sx={{ color: Colors.darkPurple, fontWeight: "Bold" }}
                      >
                        REST-API URL
                      </Typography>

                      <Typography
                        component="a"
                        href={`https://neurojson.io:7777/${dbInfo.db_name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: Colors.textPrimary,
                          textDecoration: "none",
                          ":hover": {
                            textDecoration: "underline",
                          },
                          wordBreak: "break-word",
                          display: "block",
                        }}
                      >
                        {`https://neurojson.io:7777/${dbInfo.db_name}`}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        sx={{ color: Colors.darkPurple, fontWeight: "Bold" }}
                      >
                        Database Creation Time
                      </Typography>
                      <Typography>
                        {dateCoverter(dbInfo.instance_start_time)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        sx={{ color: Colors.darkPurple, fontWeight: "Bold" }}
                      >
                        Searchable Database Size
                      </Typography>
                      <Typography>
                        {formatSize(dbInfo.sizes?.external)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        sx={{ color: Colors.darkPurple, fontWeight: "Bold" }}
                      >
                        DatabaseDisk Size (compressed)
                      </Typography>
                      <Typography>{formatSize(dbInfo.sizes?.file)}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
                <CardActions>
                  <Grid container direction="column" spacing={1}>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          color: Colors.lightGray,
                          backgroundColor: Colors.purple,
                          "&:hover": {
                            backgroundColor: Colors.secondaryPurple,
                          },
                        }}
                        onClick={() =>
                          navigate(`${RoutesEnum.DATABASES}/${nodeData.id}`)
                        }
                      >
                        Browse Database
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          color: Colors.lightGray,
                          backgroundColor: Colors.purple,
                          "&:hover": {
                            backgroundColor: Colors.secondaryPurple,
                          },
                        }}
                        onClick={() => navigate(`/search`)}
                      >
                        Search Subjects
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          color: Colors.lightGray,
                          backgroundColor: Colors.purple,
                          "&:hover": {
                            backgroundColor: Colors.secondaryPurple,
                          },
                        }}
                        onClick={() =>
                          window.open(
                            `https://github.com/NeuroJSON-io/${nodeData.id}`,
                            "_blank",
                            "noopener noreferrer"
                          )
                        }
                      >
                        DownLoad Database
                      </Button>
                    </Grid>
                  </Grid>
                </CardActions>
              </Card>
            ) : (
              <Typography>Select a node to see database info.</Typography>
            )}
          </>
        ) : (
          <Typography>Select a node to see database info.</Typography>
        )}
      </Box>
    </Drawer>
  );
};

export default NodeInfoPanel;
