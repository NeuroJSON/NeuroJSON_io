import { Autocomplete, TextField } from "@mui/material";
import { WidgetProps } from "@rjsf/utils";

// Combobox: type freely OR pick from a modality-specific suggestion list.
export const TypeAutocompleteWidget = (props: WidgetProps) => {
  const { value, onChange, options, label, placeholder } = props;
  const suggestions = (options.suggestions as string[]) || [];

  return (
    <Autocomplete
      freeSolo
      options={suggestions}
      value={value || ""}
      onChange={(_, v) => onChange(typeof v === "string" ? v : "")}
      onInputChange={(_, v) => onChange(v || "")}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder || "e.g. bold, T1w"}
          size="small"
          fullWidth
        />
      )}
    />
  );
};
