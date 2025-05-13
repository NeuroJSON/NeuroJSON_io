import { TextField } from "@mui/material";
import React, { useEffect, useState } from "react";

interface FilterSearchProps {
  onFilter: (query: string) => void;
  filterKeyword: string;
}

const KeywordFilter: React.FC<FilterSearchProps> = ({
  onFilter,
  filterKeyword,
}) => {
  const [inputValue, setInputValue] = useState<string>(filterKeyword);

  useEffect(() => {
    setInputValue(filterKeyword);
  }, [filterKeyword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    onFilter(value); // Pass value to parent component
  };

  return (
    <TextField
      label="Browse databases by keyword"
      variant="outlined"
      size="small"
      value={inputValue}
      onChange={handleChange}
      sx={{
        width: 250,
        background: "white",
        borderRadius: 1,
      }}
    />
  );
};

export default KeywordFilter;
