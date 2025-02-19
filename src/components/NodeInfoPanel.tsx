import React from "react";
import { Box, Typography, IconButton, Drawer, Grid, Card, CardContent, CardActions, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { NodeObject } from "modules/universe/NeuroJsonGraph";
import { Colors} from "design/theme";

interface NodeInfoPanelProps {
    open: boolean;
    onClose: () => void;
    nodeData: NodeObject | null;
}

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ open, onClose, nodeData }) => {
    console.log("nodeData:", nodeData);
    return (
        <Drawer
        anchor="right"
        // open={true}
        open={open}
        onClose={onClose}
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
                        <Typography>{nodeData.datatype.join(",")}</Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography>Data Standards</Typography>
                        <Typography>{nodeData.standard.join(",")}</Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography>Upstream Contact</Typography>
                        <Typography>{nodeData.support}</Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Typography>NeuroJSON-Cuated Datasets</Typography>
                    </Grid>
                </Grid>
                {/*database info card*/}
                <Card sx={{ mt:2, backgroundColor: Colors.white }}>
                    <CardContent>
                        <Grid container spacing={1}>
                            <Grid item xs={12}>
                                <Typography>NeuroJSON.io Database Name</Typography>
                                <Typography></Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>REST-API URL</Typography>
                                <Typography></Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>Database Creation Time</Typography>
                                <Typography></Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>Searchable Database Size</Typography>
                                <Typography></Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography>DatabaseDisk Size_compressed</Typography>
                                <Typography></Typography>
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
                                >
                                    DownLoad Database
                                </Button>
                            </Grid>
                        </Grid>
                    </CardActions>

                </Card>
                {/* <Box display="flex" flexDirection="column">
                    <Box>
                        <Typography><strong>NeuroJSON.io Database Name</strong></Typography>
                        <Typography><strong>REST-API URL</strong></Typography>
                        <Typography><strong>Database Creation Time</strong></Typography>
                        <Typography><strong>Searchable Database Size</strong></Typography>
                        <Typography><strong>DatabaseDisk Size_compressed</strong></Typography>
                    </Box>
                </Box> */}
                </>
                ) : (
                    <Typography>Select a node to see metadata.</Typography>
                )}
            </Box>
        </Drawer>
    )
};

export default NodeInfoPanel;
