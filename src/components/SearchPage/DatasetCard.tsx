import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Grid,
  Link,
} from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

interface DatasetCardProps {
  dbname: string;
  dsname: string;
  parsedJson: {
    key: string;
    value: {
      name?: string;
      readme?: string;
      modality?: string[];
      subj?: string[];
      info?: {
        Authors?: string[];
        DatasetDOI?: string;
      };
    };
  };
}

const DatasetCard: React.FC<DatasetCardProps> = ({
  dbname,
  dsname,
  parsedJson,
}) => {
  const { name, readme, modality, subj, info } = parsedJson.value;

  // prepare DOI URL
  const rawDOI = info?.DatasetDOI?.replace(/^doi:/, "");
  const doiLink = rawDOI ? `https://doi.org/${rawDOI}` : null;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: "#6C6C8E", fontWeight: 600 }}>
          {name || "Untitled Dataset"}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          ID: {dsname}
        </Typography>

        <Stack>
          {subj && <Chip label={`${subj.length} subjects`} color="primary" />}
          {modality?.map((mod, idx) => (
            <Chip key={idx} label={mod} color="info" />
          ))}
        </Stack>

        {readme && (
          <Typography variant="body2" paragraph>
            <strong>Summary:</strong> {readme}
          </Typography>
        )}

        {info?.Authors?.length && (
          <Typography>
            <strong>Authors:</strong> {info?.Authors?.join(", ")}
          </Typography>
        )}

        {doiLink && (
          <Stack mt={1}>
            <Chip
              label="DOI"
              component="a"
              href={doiLink}
              target="_blank"
              rel="noopener noreferrer"
              clickable
              sx={{ backgroundColor: "#c9a636", color: "white" }}
            />
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default DatasetCard;
