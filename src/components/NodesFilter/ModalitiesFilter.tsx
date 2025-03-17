import { Box, FormControlLabel, Checkbox, Typography } from "@mui/material";
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
      {/* <Typography variant="subtitle1"> Select Modalities</Typography> */}
      {modalitiesList.map((modality) => (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <FormControlLabel
            key={modality}
            control={
              <Checkbox
                checked={selectedModalities.includes(modality)}
                onChange={() => handleModalityChange(modality)}
              />
            }
            label={modality}
          />
        </Box>
      ))}
    </Box>
  );
};

export default ModalitiesFilter;
