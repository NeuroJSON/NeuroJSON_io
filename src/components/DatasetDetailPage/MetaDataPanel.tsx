import { Box, Typography } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

type Props = {
  dbViewInfo: any;
  datasetDocument: any;
};

const MetaDataPanel: React.FC<Props> = ({ dbViewInfo, datasetDocument }) => {
  return (
    <Box
      sx={{
        backgroundColor: Colors.white,
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0, // <-- for scroller
          overflowY: "auto", // <-- keep the scroller here
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            Modalities
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {dbViewInfo?.rows?.[0]?.value?.modality?.join(", ") ?? "N/A"}
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            DOI
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {(() => {
              const doi =
                datasetDocument?.["dataset_description.json"]?.DatasetDOI ||
                datasetDocument?.["dataset_description.json"]?.ReferenceDOI;

              if (!doi) return "N/A";

              // Normalize into a clickable URL
              let url = doi;
              if (/^10\./.test(doi)) {
                url = `https://doi.org/${doi}`;
              } else if (/^doi:/.test(doi)) {
                url = `https://doi.org/${doi.replace(/^doi:/, "")}`;
              }

              return (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "inherit",
                    textDecoration: "underline",
                  }}
                >
                  {url}
                </a>
              );
            })()}
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            Subjects
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {dbViewInfo?.rows?.[0]?.value?.subj?.length ?? "N/A"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            License
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {datasetDocument?.["dataset_description.json"]?.License ?? "N/A"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            BIDS Version
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {datasetDocument?.["dataset_description.json"]?.BIDSVersion ??
              "N/A"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            References and Links
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {Array.isArray(
              datasetDocument?.["dataset_description.json"]?.ReferencesAndLinks
            )
              ? datasetDocument["dataset_description.json"].ReferencesAndLinks
                  .length > 0
                ? datasetDocument[
                    "dataset_description.json"
                  ].ReferencesAndLinks.join(", ")
                : "N/A"
              : datasetDocument?.["dataset_description.json"]
                  ?.ReferencesAndLinks ?? "N/A"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default MetaDataPanel;
