import { Box, FormControlLabel, Checkbox, Typography } from "@mui/material";
import { Colors } from "design/theme";
import { DATA_TYPE_COLORS } from "modules/universe/NeuroJsonGraph";
import React, { useEffect, useState } from "react";

interface ModalitiesFilterProps {
  onFilter: (selectedModalities: string[]) => void;
  homeSeletedModalities: string[]; // add prop to receive parent state
}

const modalitiesList = ["mri", "pet", "meg", "eeg", "ieeg", "dwi", "fnirs"];

const ModalitiesFilter: React.FC<ModalitiesFilterProps> = ({
  onFilter,
  homeSeletedModalities,
}) => {
  const [selectedModalities, setSelectedModalities] = useState<string[]>(
    homeSeletedModalities
  );

  useEffect(() => {
    setSelectedModalities(homeSeletedModalities);
  }, [homeSeletedModalities]);

  const handleModalityChange = (modality: string) => {
    const updatedModalities = selectedModalities.includes(modality)
      ? selectedModalities.filter((m) => m !== modality)
      : [...selectedModalities, modality];
    setSelectedModalities(updatedModalities);
    onFilter(updatedModalities);
  };

  return (
    <Box>
      {modalitiesList.map((modality) => {
        const bgColor = DATA_TYPE_COLORS[modality]
          ? `rgb(${DATA_TYPE_COLORS[modality].join(",")})`
          : "transparent";
        return (
          <Box
            key={modality}
            sx={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <FormControlLabel
              // key={modality}
              control={
                <Checkbox
                  sx={
                    {
                      // color: Colors.lightGray,
                      // "&.Mui-checked": {
                      //   color: "black", // Change checkmark color
                      // },
                      // "&.Mui-checked.MuiCheckbox-root": {
                      //   backgroundColor: "white", // Ensures white background when checked
                      //   borderRadius: "3px",
                      // },
                      // "&.MuiCheckbox-root:hover": {
                      //   backgroundColor: "white",
                      // },
                    }
                  }
                  checked={selectedModalities.includes(modality)}
                  onChange={() => handleModalityChange(modality)}
                />
              }
              label={
                <Typography
                  sx={{
                    color: Colors.lightGray,
                    backgroundColor: bgColor,
                    borderRadius: "5px",
                    padding: "5px",
                    marginBottom: "5px",
                    fontWeight: "bold",
                    minWidth: "45px",
                  }}
                >
                  {modality}
                </Typography>
              }
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default ModalitiesFilter;
