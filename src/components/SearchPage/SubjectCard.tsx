import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { Typography, Card, CardContent, Stack, Chip } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { Link } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

interface SubjectCardProps {
  dbname: string;
  dsname: string;
  age: string;
  subj: string;
  parsedJson: {
    key: string[];
    value: {
      modalities?: string[];
      tasks?: string[];
      sessions?: string[];
      types?: string[];
    };
  };
  index: number;
  onChipClick: (key: string, value: string) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  dbname,
  dsname,
  age,
  subj,
  parsedJson,
  index,
  onChipClick,
}) => {
  const { modalities, tasks, sessions, types } = parsedJson.value;
  const subjectLink = `${RoutesEnum.DATABASES}/${dbname}/${dsname}`;

  // get the gender of subject
  const genderCode = parsedJson?.key?.[1];
  let genderDisplay = "Unknown";

  if (genderCode) {
    if (genderCode === "000F") genderDisplay = "Female";
    else if (genderCode === "000M") genderDisplay = "Male";
  }

  // cover age string to readable format
  let ageDisplay = "N/A";
  if (age) {
    const ageNum = parseInt(age, 10) / 100;
    if (Number.isInteger(ageNum)) {
      ageDisplay = `${ageNum} years`;
    } else {
      ageDisplay = `${ageNum.toFixed(1)} years`;
    }
  }

  return (
    <Card sx={{ mb: 3, position: "relative" }}>
      <CardContent>
        {/* card number in bottom-right */}
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
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            ":hover": { textDecoration: "underline" },
          }}
          component={Link}
          to={subjectLink}
          target="_blank"
        >
          <PersonOutlineIcon />
          Subject: {subj} &nbsp;&nbsp;|&nbsp;&nbsp; Dataset: {dsname}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          Age: {ageDisplay} &nbsp;&nbsp;|&nbsp;&nbsp; Gender: {genderDisplay}{" "}
          &nbsp;&nbsp;|&nbsp;&nbsp; Database: {dbname}
        </Typography>

        <Stack spacing={2} margin={1}>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            gap={1}
            alignItems="center"
          >
            <Typography variant="body2" mt={1}>
              <strong>Modalities:</strong>
            </Typography>
            {modalities?.map((mod, idx) => (
              <Chip
                key={idx}
                label={mod}
                variant="outlined"
                onClick={() => onChipClick("modality", mod)} //
                sx={{
                  "& .MuiChip-label": {
                    paddingX: "6px",
                    fontSize: "0.8rem",
                  },
                  height: "24px",
                  color: Colors.darkPurple,
                  border: `1px solid ${Colors.darkPurple}`,
                  fontWeight: "bold",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: `${Colors.purple} !important`,
                    color: "white",
                    borderColor: Colors.purple,
                  },
                }}
              />
            ))}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            gap={1}
            alignItems="center"
          >
            <Typography variant="body2" mt={1}>
              <strong>Tasks:</strong>
            </Typography>
            {Array.isArray(tasks) && tasks.length > 0 ? (
              tasks.map((task, idx) => (
                <Chip
                  key={`task-${idx}`}
                  label={task}
                  variant="outlined"
                  onClick={() => onChipClick("task_name", task)}
                  sx={{
                    "& .MuiChip-label": {
                      paddingX: "6px",
                      fontSize: "0.8rem",
                    },
                    height: "24px",
                    color: Colors.darkPurple,
                    border: `1px solid ${Colors.darkPurple}`,
                    fontWeight: "bold",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: `${Colors.purple} !important`,
                      color: "white",
                      borderColor: Colors.purple,
                    },
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" mt={1}>
                N/A
              </Typography>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            gap={1}
            alignItems="center"
          >
            <Typography variant="body2" mt={1}>
              <strong>Types:</strong>
            </Typography>
            {Array.isArray(types) && types.length > 0 ? (
              types.map((type, idx) => (
                <Chip
                  key={`type-${idx}`}
                  label={type}
                  variant="outlined"
                  onClick={() => onChipClick("type_name", type)}
                  sx={{
                    "& .MuiChip-label": {
                      paddingX: "6px",
                      fontSize: "0.8rem",
                    },
                    height: "24px",
                    color: Colors.darkPurple,
                    border: `1px solid ${Colors.darkPurple}`,
                    fontWeight: "bold",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: `${Colors.purple} !important`,
                      color: "white",
                      borderColor: Colors.purple,
                    },
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
              <strong>Sessions:</strong> {sessions?.length}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default SubjectCard;
