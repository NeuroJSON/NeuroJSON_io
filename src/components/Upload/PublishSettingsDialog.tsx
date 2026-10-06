import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useEffect, useState } from "react";
import { UploadService } from "services/upload.service";
import {
  getRequestedDbError,
  getRequestedIdError,
  useExistingDbNames,
} from "utils/uploadValidation";

interface PublishSettingsDialogProps {
  open: boolean;
  internalId: string;
  currentDb: string | null; // "public" when unset
  currentId: string | null; // null = NeuroJSON assigns
  onClose: () => void;
  onSaved: () => void;
}

const radioSx = { "&.Mui-checked": { color: Colors.purple } };

// Edit the target database + preferred dataset id without re-uploading.
const PublishSettingsDialog: React.FC<PublishSettingsDialogProps> = ({
  open,
  internalId,
  currentDb,
  currentId,
  onClose,
  onSaved,
}) => {
  const existingDbs = useExistingDbNames();
  const [db, setDb] = useState("");
  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [customId, setCustomId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form to the saved values each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setDb(currentDb && currentDb !== "public" ? currentDb : "");
    setMode(currentId ? "custom" : "auto");
    setCustomId(currentId || "");
    setError(null);
  }, [open, currentDb, currentId]);

  const dbError = getRequestedDbError(db, existingDbs);
  const idError =
    mode === "custom"
      ? customId.trim()
        ? getRequestedIdError(customId)
        : "Enter a preferred ID, or choose “Let NeuroJSON assign one”."
      : "";

  // Warn that the old preferred id becomes available to others.
  const releasesId =
    !!currentId && (mode === "auto" || customId.trim() !== currentId);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await UploadService.updateSettings(internalId, {
        requestedDb: db.trim() || null, // null → "public"
        requestedDatasetId: mode === "auto" ? null : customId.trim(),
      });
      onSaved();
    } catch (e: any) {
      setError(e.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Publishing settings</DialogTitle>
      <DialogContent>
        <TextField
          label="Publish to database (optional)"
          placeholder="public (default)"
          value={db}
          onChange={(e) => setDb(e.target.value)}
          size="small"
          fullWidth
          error={!!dbError}
          helperText={
            dbError ||
            "Becomes part of the public URL after review (e.g. /db/smith-lab/…). Leave blank for public."
          }
          sx={{ mt: 1 }}
        />

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 0.5 }}>
          Dataset ID
        </Typography>
        <RadioGroup
          value={mode}
          onChange={(e) => setMode(e.target.value as "auto" | "custom")}
        >
          <FormControlLabel
            value="auto"
            control={<Radio sx={radioSx} />}
            label={
              <>
                Let NeuroJSON assign one (<code>njds######</code>)
              </>
            }
          />
          <FormControlLabel
            value="custom"
            control={<Radio sx={radioSx} />}
            label="Use my preferred ID"
          />
        </RadioGroup>
        {mode === "custom" && (
          <TextField
            placeholder="my-fmri-study"
            value={customId}
            onChange={(e) => setCustomId(e.target.value)}
            size="small"
            fullWidth
            error={!!idError}
            helperText={
              idError ||
              "Use only lowercase letters and numbers; join words with - or _."
            }
            sx={{ mt: 0.5, ml: 4, width: "calc(100% - 32px)" }}
          />
        )}

        {releasesId && (
          <Alert severity="info" sx={{ mt: 2, fontSize: "0.9rem" }}>
            Your preferred ID <code>{currentId}</code> will be released, and
            other users can then use it.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ color: Colors.darkGray }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={save}
          disabled={saving || !!dbError || !!idError}
          sx={{
            backgroundColor: Colors.purple,
            "&:hover": { backgroundColor: Colors.secondaryPurple },
          }}
        >
          {saving ? (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CircularProgress size={20} sx={{ color: "white" }} />
            </Box>
          ) : (
            "Save"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PublishSettingsDialog;
