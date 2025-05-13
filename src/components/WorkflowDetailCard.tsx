import { Typography, Card, CardContent, Box, CardMedia } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

interface WorkflowDetailCardProps {
  type: "data-portals" | "json-conversion" | "database" | "rest-api";
}

const cardContentMap = {
  "data-portals": {
    title: "Data Portals",
    backgroundColor: "#99aff0",
    color: Colors.darkPurple,
    description: `NeuroJSON.io curates reusable neuroimaging datasets with searchable and standardized metadata. It hosts thousands of BIDS compatible datasets with diverse imaging modalities, including MRI, fMRI, EEG, MEG, fNIRS measurements and processed data such as segmentation, surface and tetrahedral meshes.`,
  },
  "json-conversion": {
    title: "JSON Conversion",
    backgroundColor: "#384979",
    color: Colors.lightGray,
    description: `NeuroJSON project adopts internationally standardized JSON and binary JSON formats as the unified data exchange format for complex scientific data. Using JSON for storing and exchanging neuroimaging data not only make the dataset cloud- and web-ready, but also reinforces human-readability - the key to ensure long-term reusability of datasets.`,
  },
  database: {
    title: "Scalable Neuroimaging Database",
    backgroundColor: "#ffd230",
    color: Colors.darkPurple,
    description: `NeuroJSON.io utilizes industrial standard NoSQL databases and JSON data exchange format to store, index, and query large-scale neuroimaging datasets, accommodating rapid growth in the needs for emerging machine learning based data analyses. It converts all searchable metadata in the form of lightweight JSON format, making the data easy to reuse and understood.`,
  },
  "rest-api": {
    title: "REST-API Data Access",
    backgroundColor: "#3533cd",
    color: Colors.lightGray,
    description: `Every dataset hosted on NeuroJSON.io can be accessed via the REST-APIs - a URL-based universal data retrieval and manipulation method, making it possible to dynamically query, download, and analyze large-scale neuroimaging datasets inside diverse programming environments such as MATLAB, Octave and Python.`,
  },
};

const WorkflowDetailCard: React.FC<WorkflowDetailCardProps> = ({ type }) => {
  const { title, description, backgroundColor, color } = cardContentMap[type];

  return (
    <Card
      sx={{
        borderRadius: "10px",
        minWidth: "300px",
        transition: "all 0.3s ease",
      }}
    >
      {/* Image on top */}
      {/* <CardMedia
        component="img"
        height="160"
        image={`${process.env.PUBLIC_URL}/img/section4_data_portals.png`}
        alt="Data Portals"
        sx={{ objectFit: "contain", backgroundColor: Colors.purpleGrey }}
      /> */}

      <Box sx={{ width: "100%", backgroundColor, px: 2, py: 1 }}>
        <Typography
          gutterBottom
          variant="h6"
          component="div"
          sx={{ color, fontWeight: "bold" }}
        >
          {title}
        </Typography>
      </Box>
      {/* Title and content */}
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default WorkflowDetailCard;
