import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
  Paper,
  Typography,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AuthSelector } from "redux/auth/auth.selector";
import { UploadService } from "services/upload.service";
import RoutesEnum from "types/routes.enum";

const UploadPage: React.FC = () => {
  const { isLoggedIn } = useAppSelector(AuthSelector);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetOutcome = () => {
    setResult(null);
    setSubmitError(null);
  };

  const handleFile = async (f: File | undefined) => {
    resetOutcome();
    setParsed(null);
    setParseError(null);
    if (!f) return;
    setFile(f);
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (!json || typeof json !== "object" || Array.isArray(json)) {
        setParseError("The file must contain a single JSON object.");
        return;
      }
      setParsed(json);
    } catch (e: any) {
      setParseError(`Not valid JSON: ${e.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!parsed) return;
    setSubmitting(true);
    resetOutcome();
    try {
      const res = await UploadService.uploadJson(parsed);
      setResult({ id: res.id });
    } catch (e: any) {
      setSubmitError(e.message || "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Login guard — the endpoint requires auth; prompt to log in.
  if (!isLoggedIn) {
    return (
      <Container maxWidth="sm" sx={{ mt: 6, mb: 6 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Please log in to upload
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Uploading a dataset for review requires a NeuroJSON account.
          </Typography>
          <Button
            variant="contained"
            component={Link}
            to={RoutesEnum.DASHBOARD}
            sx={{ backgroundColor: Colors.purple }}
          >
            Log in
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6, mb: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
        Upload a dataset
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Select a JSON file (e.g. the file produced by AutoBIDSify). It will be
        submitted to our sandbox for the NeuroJSON team to review before it is
        added to a database.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          sx={{ color: Colors.purple, borderColor: Colors.purple }}
        >
          Choose JSON file
        </Button>
        {file && (
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            Selected: <strong>{file.name}</strong>{" "}
            {parsed && (
              <Box component="span" sx={{ color: "success.main" }}>
                ✓ valid JSON
              </Box>
            )}
          </Typography>
        )}

        {parseError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {parseError}
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            disabled={!parsed || submitting}
            onClick={handleSubmit}
            sx={{ backgroundColor: Colors.purple }}
          >
            {submitting ? (
              <CircularProgress size={22} sx={{ color: "white" }} />
            ) : (
              "Submit for review"
            )}
          </Button>
        </Box>

        {result && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Submitted for review. Reference id: <code>{result.id}</code>
          </Alert>
        )}
        {submitError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {submitError}
          </Alert>
        )}
      </Paper>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: "block" }}>
        Coming from AutoBIDSify? Convert your dataset in the{" "}
        <MuiLink component={Link} to={RoutesEnum.BIDS_CONVERTER}>
          converter
        </MuiLink>
        , then upload the generated JSON here.
      </Typography>
    </Container>
  );
};

export default UploadPage;
