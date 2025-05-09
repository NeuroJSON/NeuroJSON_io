import { Typography, Card, CardContent, Stack, Chip } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { Link } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

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
  index: number;
  onChipClick: (key: string, value: string) => void;
}

const DatasetCard: React.FC<DatasetCardProps> = ({
  dbname,
  dsname,
  parsedJson,
  index,
  onChipClick,
}) => {
  const { name, readme, modality, subj, info } = parsedJson.value;
  const datasetLink = `${RoutesEnum.DATABASES}/${dbname}/${dsname}`;

  // prepare DOI URL
  const rawDOI = info?.DatasetDOI?.replace(/^doi:/, "");
  const doiLink = rawDOI ? `https://doi.org/${rawDOI}` : null;

  return (
    <Card sx={{ mb: 3, position: "relative" }}>
      <CardContent>
        {/* Card Number in Top Right */}
        <Typography
          variant="subtitle2"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 12,
            fontWeight: 600,
            color: Colors.darkPurple,
          }}
        >
          #{index + 1}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: Colors.darkPurple,
            textDecoration: "none",
            ":hover": { textDecoration: "underline" },
          }}
          component={Link}
          to={datasetLink}
          target="_blank"
        >
          {name || "Untitled Dataset"}
        </Typography>
        <Typography>
          Database: {dbname} &nbsp;&nbsp;|&nbsp;&nbsp; Dataset Number: {dsname}
        </Typography>

        <Stack spacing={2} margin={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Typography variant="body2" mt={1}>
              <strong>Modalities:</strong>
            </Typography>

            {Array.isArray(modality) && modality.length > 0 ? (
              modality.map((mod, idx) => (
                <Chip
                  key={idx}
                  label={mod}
                  variant="outlined"
                  onClick={() => onChipClick("modality", mod)} //
                  sx={{
                    color: Colors.darkPurple,
                    border: `1px solid ${Colors.darkPurple}`,
                    fontWeight: "bold",
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" mt={1}>
                N/A
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Typography variant="body2" mt={1}>
              <strong>Subjects:</strong> {subj && `${subj.length} subjects`}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {readme && (
              <Typography
                variant="body2"
                paragraph
                sx={{ textOverflow: "ellipsis" }}
              >
                <strong>Summary:</strong> {readme}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {info?.Authors?.length && (
              <Typography variant="body2" mt={1}>
                {info?.Authors && (
                  <Typography variant="body2" mt={1}>
                    <strong>Authors:</strong>{" "}
                    {Array.isArray(info.Authors)
                      ? info.Authors.join(", ")
                      : typeof info.Authors === "string"
                      ? info.Authors
                      : "N/A"}
                  </Typography>
                )}
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {doiLink && (
              <Stack mt={1}>
                <Chip
                  label="DOI"
                  component="a"
                  href={doiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  clickable
                  sx={{ backgroundColor: Colors.accent, color: "white" }}
                />
              </Stack>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DatasetCard;
