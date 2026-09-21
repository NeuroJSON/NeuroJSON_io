import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link as MuiLink,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthSelector } from "redux/auth/auth.selector";
import { UploadService } from "services/upload.service";
import RoutesEnum from "types/routes.enum";

const UploadPage: React.FC = () => {
  const { isLoggedIn } = useAppSelector(AuthSelector);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const initialDatasetId =
    new URLSearchParams(location.search).get("datasetId") ?? "";

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [datasetId, setDatasetId] = useState(initialDatasetId);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    datasetId: string;
    submissionId: string;
    status: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null); // approved/blocked
  const [confirmPrompt, setConfirmPrompt] = useState<{
    code: string;
    message: string;
  } | null>(null);

  const resetOutcome = () => {
    setResult(null);
    setSubmitError(null);
    setInfoMessage(null);
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

  const submit = async (confirm: boolean) => {
    if (!parsed) return;
    setSubmitting(true);
    resetOutcome();
    setConfirmPrompt(null);
    try {
      const { status, data } = await UploadService.uploadJson(parsed, {
        datasetId: datasetId.trim() || undefined,
        confirm,
      });
      if (status === 201) {
        setResult({
          datasetId: data.dataset_id,
          submissionId: data.submission_id,
          status: data.status,
        });
      } else if (status === 409 && data.requiresConfirmation) {
        setConfirmPrompt({ code: data.code, message: data.message });
      } else if (status === 409) {
        setInfoMessage(
          data.message || "This dataset cannot be updated right now."
        );
      } else {
        setSubmitError(data.error || data.message || `Upload failed (${status})`);
      }
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
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            Please log in to upload
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2, fontSize: "1rem" }}>
            Uploading a dataset for review requires a NeuroJSON account.
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={Link}
            to={RoutesEnum.DASHBOARD}
            sx={{
              backgroundColor: Colors.purple,
              "&:hover": { backgroundColor: Colors.secondaryPurple },
            }}
          >
            Log in
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6, mb: 6 }}>
      <Typography
        variant="h4"
        sx={{ fontWeight: 600, mb: 1.5, color: Colors.white }}
      >
        Upload a dataset
      </Typography>
      <Typography
        sx={{
          mb: 3,
          color: Colors.lightGray,
          fontSize: "1.05rem",
          lineHeight: 1.6,
        }}
      >
        Select a JSON file. It will be submitted to our sandbox for the
        NeuroJSON team to review before it is added to a database.
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: "0.9rem" }}>
          Your file is reviewed by the NeuroJSON team before it is added to a
          database. A new reference id is assigned on submission — any existing{" "}
          <code>_id</code>/<code>_rev</code> in your file is ignored.
        </Alert>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Button
          variant="outlined"
          size="large"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            color: Colors.purple,
            borderColor: Colors.purple,
            fontSize: "1rem",
            "&:hover": {
              borderColor: Colors.secondaryPurple,
              backgroundColor: "rgba(74, 76, 183, 0.08)",
            },
          }}
        >
          Choose JSON file
        </Button>
        {file && (
          <Typography sx={{ mt: 1.5, fontSize: "1rem" }}>
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

        {/* Optional: updating an existing dataset */}
        <TextField
          label="Updating an existing dataset? Enter its NeuroJSON ID (optional)"
          placeholder="njds000001"
          value={datasetId}
          onChange={(e) => setDatasetId(e.target.value)}
          size="small"
          fullWidth
          sx={{ mt: 2.5 }}
        />

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            disabled={!parsed || submitting}
            onClick={() => submit(false)}
            sx={{
              backgroundColor: Colors.purple,
              fontSize: "1rem",
              "&:hover": { backgroundColor: Colors.secondaryPurple },
            }}
          >
            {submitting ? (
              <CircularProgress size={22} sx={{ color: "white" }} />
            ) : (
              "Submit for review"
            )}
          </Button>
        </Box>

        {result && (
          <Alert severity="success" sx={{ mt: 3, fontSize: "0.95rem" }}>
            Submitted for review.
            <br />
            Dataset ID: <code>{result.datasetId}</code>
            <br />
            Submission: <code>{result.submissionId}</code> ({result.status})
          </Alert>
        )}
        {infoMessage && (
          <Alert severity="info" sx={{ mt: 3, fontSize: "0.95rem" }}>
            {infoMessage}
          </Alert>
        )}
        {submitError && (
          <Alert severity="error" sx={{ mt: 3, fontSize: "0.95rem" }}>
            {submitError}
          </Alert>
        )}
      </Paper>

      <Typography
        sx={{
          mt: 2,
          display: "block",
          color: Colors.lightGray,
          fontSize: "0.95rem",
        }}
      >
        Coming from AutoBIDSify? Convert your dataset in the{" "}
        <MuiLink
          component={Link}
          to={RoutesEnum.BIDS_CONVERTER}
          sx={{ color: Colors.lightGreen }}
        >
          converter
        </MuiLink>
        , then upload the generated JSON here.
      </Typography>

      {/* Confirmation dialog for promoted/rejected resubmissions */}
      <Dialog open={!!confirmPrompt} onClose={() => setConfirmPrompt(null)}>
        <DialogTitle>Submit a new version?</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmPrompt?.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmPrompt(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => submit(true)}
            sx={{
              backgroundColor: Colors.purple,
              "&:hover": { backgroundColor: Colors.secondaryPurple },
            }}
          >
            Submit new version
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UploadPage;
