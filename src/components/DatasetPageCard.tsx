import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Link,
  Stack,
  Typography,
  Grid,
} from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Row } from "redux/neurojson/types/neurojson.interface";
import RoutesEnum from "types/routes.enum";

interface DatasetPageCardProps {
  doc: Row;
  index: number;
  dbName: string;
  pageSize: number;
  page: number;
}

const DatasetPageCard: React.FC<DatasetPageCardProps> = ({
  doc,
  index,
  dbName,
  page,
  pageSize,
}) => {
  const navigate = useNavigate();
  const datasetIndex = (page - 1) * pageSize + index + 1;
  return (
    <Grid item xs={12} sm={6} key={doc.id}>
      <Card
        sx={{
          position: "relative",
          backgroundColor: Colors.white,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            right: 12,
            fontSize: "1rem",
            fontWeight: "bold",
            color: Colors.darkPurple,
          }}
        >
          #{datasetIndex}
        </Box>
        <CardContent sx={{ flex: 1 }}>
          <Button
            onClick={() =>
              navigate(
                `${RoutesEnum.DATABASES}/${encodeURIComponent(
                  dbName ?? ""
                )}/${encodeURIComponent(doc.id ?? "")}`
              )
            }
            sx={{
              fontSize: "1.25rem",
              margin: 0,
              color: Colors.darkPurple,
              textTransform: "none",
              justifyContent: "flex-start",
              width: "100%",
              textAlign: "left",
              "&:hover": {
                textDecoration: "underline",
                color: Colors.purple,
                backgroundColor: "transparent",
                transform: "scale(1.01)",
              },
            }}
          >
            {doc.value.name || "Untitled"}
          </Button>

          <Typography
            color={Colors.textSecondary}
            variant="body2"
            sx={{ mb: 2, marginLeft: 1 }}
          >
            ID: {doc.id}
          </Typography>

          <Stack spacing={2} margin={1}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {doc.value.subj && (
                <Chip
                  label={`${doc.value.subj.length} subjects`}
                  size="small"
                  sx={{
                    backgroundColor: Colors.darkOrange,
                    color: Colors.white,
                  }}
                />
              )}
              {doc.value.modality &&
                doc.value.modality.map((mod: string) => (
                  <Chip
                    key={mod}
                    label={mod}
                    size="small"
                    sx={{
                      backgroundColor: Colors.purple,
                      color: Colors.white,
                    }}
                  />
                ))}
            </Stack>

            <Typography variant="body2" color={Colors.textSecondary}>
              <strong>Summary:</strong>{" "}
              {doc.value.readme || "No description available"}
            </Typography>

            <Typography variant="body2" color={Colors.textPrimary}>
              <strong>Authors:</strong>{" "}
              {Array.isArray(doc.value.info?.Authors)
                ? doc.value.info.Authors.join(", ")
                : doc.value.info?.Authors || "Unknown"}
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color={Colors.textPrimary}>
                <strong>Size:</strong>{" "}
                {doc.value.length
                  ? `${(doc.value.length / 1024 / 1024).toFixed(2)} MB`
                  : "Unknown"}
              </Typography>

              {doc.value.info?.DatasetDOI && (
                <Link
                  href={doc.value.info.DatasetDOI}
                  target="_blank"
                  rel="noopener"
                >
                  <Chip
                    label="DOI"
                    size="small"
                    clickable
                    sx={{ backgroundColor: Colors.accent, color: Colors.white }}
                  />
                </Link>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default DatasetPageCard;
