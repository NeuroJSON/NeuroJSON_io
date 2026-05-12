import { Autocomplete, Chip, TextField } from "@mui/material";
import { WidgetProps } from "@rjsf/utils";

// Multi-select combobox for file extensions (e.g. ".jdb", ".snirf").
// Options come from uiSchema's ui:options.fileTypes, fetched once by the
// parent SearchPage from /api/v1/dbs/file-types.
export const FileTypeAutocompleteWidget = (props: WidgetProps) => {
  const { value, onChange, options, label } = props;
  const fileTypes = (options.fileTypes as string[]) || [];
  const current: string[] = Array.isArray(value) ? value : [];

  return (
    <Autocomplete
      multiple
      options={fileTypes}
      value={current}
      onChange={(_, v) => onChange(v as string[])}
      renderTags={(items, getTagProps) =>
        items.map((item, index) => (
          <Chip
            variant="outlined"
            label={item}
            size="small"
            {...getTagProps({ index })}
            key={item}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label || "File types"}
          placeholder={current.length === 0 ? "e.g. .snirf, .jdb" : ""}
          size="small"
          fullWidth
        />
      )}
    />
  );
};
