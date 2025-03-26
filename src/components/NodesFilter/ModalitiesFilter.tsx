import {
  Box,
  FormControlLabel,
  Checkbox,
  Typography,
  Button,
} from "@mui/material";
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

  // reset function to clear all selected checkedboxes
  const handleReset = () => {
    setSelectedModalities([]); // clear the local state
    onFilter([]); // notify parent that selection is reset
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
                    textAlign: "center",
                  }}
                >
                  {modality}
                </Typography>
              }
            />
          </Box>
        );
      })}
      {/* Reset button */}
      <Button
        variant="contained"
        sx={{
          marginTop: "10px",
          backgroundColor: Colors.white,
          color: Colors.purple,
          fontWeight: "bold",
          "&:hover": {
            backgroundColor: Colors.darkPurple,
            color: Colors.green,
            boxShadow: `0px 0px 15px ${Colors.darkGreen}`,
          },
        }}
        onClick={handleReset}
      >
        Clear
      </Button>
    </Box>
  );
};

export default ModalitiesFilter;
