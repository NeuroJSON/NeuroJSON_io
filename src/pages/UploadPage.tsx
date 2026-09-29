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
import CopyButton from "components/CopyButton";
import { Colors } from "design/theme";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthSelector } from "redux/auth/auth.selector";
import { UploadService } from "services/upload.service";
import RoutesEnum from "types/routes.enum";
import {
  getRequestedDbError,
  getRequestedIdError,
  useExistingDbNames,
} from "utils/uploadValidation";

const UploadPage: React.FC = () => {
  const { isLoggedIn } = useAppSelector(AuthSelector);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const initialInternalId =
    new URLSearchParams(location.search).get("internalId") ?? "";

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [internalId, setInternalId] = useState(initialInternalId);
  const [datasetName, setDatasetName] = useState("");
  const [requestedDatasetId, setRequestedDatasetId] = useState("");
  const [requestedDb, setRequestedDb] = useState("");
  // Existing public db names — typing one of these is blocked (shared helper).
  const existingDbs = useExistingDbNames();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    internalId: string;
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
        internalId: internalId.trim() || undefined,
        datasetName: datasetName.trim() || undefined,
        // Only sent for a new dataset (the backend ignores them on update).
        requestedDatasetId: internalId.trim()
          ? undefined
          : requestedDatasetId.trim() || undefined,
        requestedDb: internalId.trim()
          ? undefined
          : requestedDb.trim() || undefined,
        confirm,
      });
      if (status === 201) {
        setResult({
          internalId: data.internal_id,
          submissionId: data.submission_id,
          status: data.status,
        });
      } else if (status === 409 && data.requiresConfirmation) {
        setConfirmPrompt({ code: data.code, message: data.message });
      } else if (status === 409 && data.message) {
        // Informational block (e.g. approved, awaiting promotion).
        setInfoMessage(data.message);
      } else {
        // Real errors, incl. REQUESTED_ID_TAKEN (which carries `error`).
        setSubmitError(
          data.error || data.message || `Upload failed (${status})`
        );
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

  // If the file already carries a name, use it and disable the name field.
  // Mirrors the backend: Name must be text; spaces-only counts as no name.
  const dd = parsed?.["dataset_description.json"] as any;
  const rawName =
    dd && typeof dd === "object" && !Array.isArray(dd) ? dd.Name : undefined;
  const fileNameTypeError =
    rawName !== undefined && rawName !== null && typeof rawName !== "string"
      ? 'The "Name" in dataset_description.json must be text.'
      : "";
  const nameFromFile = typeof rawName === "string" ? rawName.trim() : "";
  const typedName = datasetName.trim();
  const datasetNameError = fileNameTypeError
    ? fileNameTypeError
    : (nameFromFile || typedName).length > 255
    ? "Too long — 255 characters max."
    : "";
  const hasName = !!nameFromFile || !!typedName;

  // Publishing settings are set here only for a NEW dataset; for an update
  // they're edited on the upload detail page (PATCH /settings).
  const isNewDataset = !internalId.trim();

  // Live validation (shared with the detail-page settings dialog).
  const requestedIdError = isNewDataset
    ? getRequestedIdError(requestedDatasetId)
    : "";
  const requestedDbError = isNewDataset
    ? getRequestedDbError(requestedDb, existingDbs)
    : "";

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
        Select a JSON file. It is saved as a draft in our sandbox. When
        everything is ready, submit it for review from its upload detail page
        (Dashboard → Uploads).
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 2, fontSize: "0.9rem" }}>
          Uploading does not send your dataset for review. Review starts only
          after you click <strong>Submit for review</strong> on the upload
          detail page; the NeuroJSON team reviews it before it is added to a
          database. A new reference id is assigned on upload — any existing{" "}
          <code>_id</code>/<code>_rev</code> in your file is ignored.
        </Alert>

        {/* Updating an existing dataset: the id comes only from the URL
            (?internalId=…, set by the Update button) — never typed by hand. */}
        {!isNewDataset && (
          <Alert
            severity="warning"
            icon={false}
            sx={{ mb: 2, fontSize: "0.9rem" }}
          >
            You're updating an existing dataset (reference{" "}
            <code>{internalId}</code>).{" "}
            <MuiLink
              component="button"
              type="button"
              onClick={() => {
                setInternalId("");
                resetOutcome();
                navigate("/upload", { replace: true });
              }}
              sx={{
                color: Colors.purple,
                fontWeight: 600,
                verticalAlign: "baseline",
              }}
            >
              Start a new dataset instead
            </MuiLink>
          </Alert>
        )}

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

        {/* Dataset name — used when the file has no dataset_description.json Name */}
        <TextField
          label="Dataset name"
          placeholder="My dataset"
          value={nameFromFile || datasetName}
          onChange={(e) => setDatasetName(e.target.value)}
          disabled={!!nameFromFile || !!fileNameTypeError}
          size="small"
          fullWidth
          error={!!datasetNameError}
          sx={{
            mt: 2.5,
            // Highlight the "no name found" prompt so it's easy to notice
            // (red error styling wins when there's a problem).
            "& .MuiFormHelperText-root":
              nameFromFile || datasetNameError
                ? {}
                : { color: Colors.purple, fontWeight: 600 },
          }}
          helperText={
            datasetNameError ||
            (nameFromFile
              ? 'Name taken from your file ("dataset_description.json" → Name).'
              : 'No name found in your file ("dataset_description.json" → Name) — enter one here.')
          }
        />

        {/* Publishing settings: only for a NEW dataset. For an update they're
            edited on the upload detail page. */}
        {!isNewDataset && (
          <Typography
            variant="body2"
            sx={{ mt: 2.5, color: Colors.textSecondary }}
          >
            Publishing settings (database and dataset ID) are changed on the
            upload detail page.
          </Typography>
        )}

        {isNewDataset && (
          <>
            {/* Target database — where the dataset is published after review */}
            <TextField
              label="Publish to database (optional)"
              placeholder="public (default)"
              value={requestedDb}
              onChange={(e) => setRequestedDb(e.target.value)}
              size="small"
              fullWidth
              error={!!requestedDbError}
              helperText={requestedDbError || undefined}
              sx={{ mt: 2.5 }}
            />
            <Box
              component="ul"
              sx={{
                mt: 0.75,
                mb: 0,
                pl: 2.5,
                color: "text.secondary",
                fontSize: "0.78rem",
                lineHeight: 1.5,
                "& li": { mb: 0.25 },
              }}
            >
              <li>
                Becomes part of your dataset’s public URL after review (e.g.{" "}
                <code>/db/smith-lab/…</code>).
              </li>
              <li>
                Leave blank for the default <code>public</code> database.
              </li>
            </Box>

            {/* Optional preferred public ID (a preference; final id is set at review) */}
            <TextField
              label="Preferred dataset ID (optional)"
              placeholder="my-fmri-study"
              value={requestedDatasetId}
              onChange={(e) => setRequestedDatasetId(e.target.value)}
              size="small"
              fullWidth
              error={!!requestedIdError}
              helperText={requestedIdError || undefined}
              sx={{ mt: 2.5 }}
            />
            <Box
              component="ul"
              sx={{
                mt: 0.75,
                mb: 0,
                pl: 2.5,
                color: "text.secondary",
                fontSize: "0.78rem",
                lineHeight: 1.5,
                "& li": { mb: 0.25 },
              }}
            >
              <li>
                Becomes part of your dataset’s public URL after review (e.g.{" "}
                <code>/db/…/my-fmri-study</code>).
              </li>
              <li>
                Use only lowercase letters and numbers; join words with - or _
                (e.g. <code>my-fmri-study</code>).
              </li>
            </Box>
          </>
        )}

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            disabled={
              !parsed ||
              submitting ||
              !hasName ||
              !!datasetNameError ||
              !!requestedIdError ||
              !!requestedDbError
            }
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
              "Upload JSON"
            )}
          </Button>
        </Box>

        {result && (
          <Alert severity="success" sx={{ mt: 3, fontSize: "0.95rem" }}>
            {result.status === "changes_requested"
              ? "Saved. Resubmit it for review when it's ready."
              : "Saved as draft. Submit it for review when it's ready."}
            <br />
            Internal reference: <code>{result.internalId}</code>
            <CopyButton value={result.internalId} label="Copy reference" />
            <br />
            The public dataset ID is assigned after your dataset passes review.
            <br />
            <MuiLink
              component={Link}
              to={`/uploads/${result.internalId}`}
              sx={{ color: Colors.purple, fontWeight: 600 }}
            >
              Open upload details →
            </MuiLink>
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
          {confirmPrompt && (
            <Alert severity="info" sx={{ mt: 2, fontSize: "0.9rem" }}>
              {confirmPrompt.code === "DATASET_ALREADY_PROMOTED"
                ? "This starts a new draft version and replaces your working copy in the sandbox. The version already published to the public database stays unchanged — it is only replaced if the new version passes review."
                : "This starts a new draft version and replaces your working copy in the sandbox. Submit it for review when it's ready."}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmPrompt(null)}
            sx={{ color: Colors.darkGray }}
          >
            Cancel
          </Button>
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
