import React, { useEffect } from "react";
import { Box, Typography, IconButton, Drawer, Grid, Card, CardContent, CardActions, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { NodeObject } from "modules/universe/NeuroJsonGraph";
import { Colors} from "design/theme";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import { RootState } from "redux/store";
import { fetchDbInfo } from "redux/neurojson/neurojson.action";


interface NodeInfoPanelProps {
    open: boolean;
    onClose: () => void;
    nodeData: NodeObject | null;
}

// helper function to covert the database size format
const formatSize = (bytes?: number): string =>{
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

// 1 Kilobyte (KB)  = 1,024 Bytes
// 1 Megabyte (MB)  = 1,024 KB      = 1,048,576 Bytes (1024*1024)
// 1 Gigabyte (GB)  = 1,024 MB      = 1,073,741,824 Bytes (1024*1024*1024)

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ open, onClose, nodeData }) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const dbInfo = useAppSelector((state: RootState) => state.neurojson.dbInfo);
    const loading = useAppSelector((state: RootState) => state.neurojson.loading);
    console.log("dbInfo", dbInfo);

    useEffect(() => {
        if (nodeData?.id) {
            dispatch(fetchDbInfo(nodeData.id.toLowerCase()));
        }
    }, [nodeData, dispatch])

    return (
        <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        container={document.body}
        sx={{
            "& .MuiDrawer-paper": {
                width: "30%",
                padding: "1rem",
                backgroundColor: Colors.lightGray,
                boxShadow: "-2px 0 8px rgba(0, 0, 0, 0.2)",
            },
        }}
        >
            <Box>
                {nodeData? (
                <>
                {/* Close Button */}
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" sx={{color: Colors.primary.dark}}>{nodeData.name}</Typography>
                    <IconButton onClick={onClose} sx={{color: Colors.primary.main}}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                {/* Node Metadata */}
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Typography>Website</Typography>
                        <Typography>
                            <a href={nodeData.url} target="_blank">{nodeData.url}</a>
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography>Number of Datasets</Typography>
                        <Typography>{nodeData.datasets}</Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography>Data Types</Typography>
                        <Typography>{nodeData.datatype.join(", ")}</Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography>Data Standards</Typography>
                        <Typography>{nodeData.standard.join(", ")}</Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography>Upstream Contact</Typography>
                        <a href={`mailto:${nodeData.support}`} style={{ textDecoration: "none", color: "blue"}}>
                            <Typography>{nodeData.support}</Typography>
                        </a>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography>NeuroJSON-Cuated Datasets</Typography>
                        {dbInfo?(<Typography>{dbInfo.doc_count - 1}</Typography>) : "Coming soon "}
                    </Grid>
                </Grid>
                {/*database info card*/}
                {dbInfo? (
                    <Card sx={{ mt:2, backgroundColor: Colors.white }}>
                    <CardContent>
                        <Grid container spacing={1}>
                            <Grid item xs={12}>
                                <Typography>NeuroJSON.io Database Name</Typography>
                                <Typography>{dbInfo.db_name}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>REST-API URL</Typography>
                                <a href={`https://neurojson.io:7777/${dbInfo.db_name}`} target="_blank" rel="noopener noreferrer">
                                    {`https://neurojson.io:7777/${dbInfo.db_name}`}
                                </a>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>Database Creation Time</Typography>
                                <Typography></Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>Searchable Database Size</Typography>
                                <Typography>{formatSize(dbInfo.sizes?.external)}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>DatabaseDisk Size (compressed)</Typography>
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
                                        backgroundColor: Colors.primary.main,
                                        color: Colors.white,
                                        "&:hover": {
                                            backgroundColor: Colors.primary.dark,
                                        },
                                    }}
                                    onClick={() => navigate(`/databases/${nodeData.id}`)}
                                >
                                    Browse Database
                                </Button>
                            </Grid>
                            <Grid item xs={12}>
                                <Button 
                                    variant="contained" 
                                    fullWidth
                                    sx={{
                                        backgroundColor: Colors.primary.main,
                                        color: Colors.white,
                                        "&:hover": {
                                            backgroundColor: Colors.primary.dark,
                                        },
                                    }}
                                >
                                    Search Subjects
                                </Button>
                            </Grid>
                            <Grid item xs={12}>
                                <Button 
                                    variant="contained" 
                                    fullWidth
                                    sx={{
                                        backgroundColor: Colors.primary.main,
                                        color: Colors.white,
                                        "&:hover": {
                                            backgroundColor: Colors.primary.dark,
                                        },
                                    }}
                                >
                                    Advanced Search
                                </Button>
                            </Grid>
                            <Grid item xs={12}>
                                <Button 
                                    variant="contained" 
                                    fullWidth
                                    sx={{
                                        backgroundColor: Colors.primary.main,
                                        color: Colors.white,
                                        "&:hover": {
                                            backgroundColor: Colors.primary.dark,
                                        },
                                    }}
                                    onClick={() => window.open(`https://github.com/NeuroJSON-io/${nodeData.id}`, "_blank", "noopener noreferrer")}
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
    )
};

export default NodeInfoPanel;
