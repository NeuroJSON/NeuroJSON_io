import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import CopyButton from "components/CopyButton";
import { Colors } from "design/theme";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RawExtractionStatus,
  RawStatus,
  RawUploadError,
  RawUploadService,
} from "services/rawUpload.service";
import { formatBytes } from "utils/formatBytes";
import { RawUploader, rawUploadSupported } from "utils/rawUploader";

// "Raw data (ZIP)" section of the upload detail page: shows the version's
// current ZIP and uploads a new one straight to the storage API (tus).

const MAX_BYTES = 500_000_000_000; // 500 GB — same limit as the server
const POLL_MS = 3000;

type Phase = "idle" | "starting" | "uploading" | "paused" | "verifying";

const EXTRACTION_LABEL: Record<RawExtractionStatus, string> = {
  not_extracted: "Not extracted yet",
  extracting: "Extracting…",
  extracted: "Extracted",
  failed: "Extraction failed",
};

const formatEta = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60) return `about ${Math.ceil(seconds)} s left`;
  if (seconds < 3600) return `about ${Math.ceil(seconds / 60)} min left`;
  const h = Math.floor(seconds / 3600);
  return `about ${h} h ${Math.ceil((seconds - h * 3600) / 60)} min left`;
};

const purpleButton = {
  backgroundColor: Colors.purple,
  "&:hover": { backgroundColor: Colors.secondaryPurple },
};
const outlinedPurple = { color: Colors.purple, borderColor: Colors.purple };

interface RawDataUploaderProps {
  internalId: string;
  status?: string | null; // submission status from the page; reload when it changes
  onChanged?: () => void; // parent reloads the dataset (readiness etc.)
}

const RawDataUploader: React.FC<RawDataUploaderProps> = ({
  internalId,
  status: submissionStatus,
  onChanged,
}) => {
  const [status, setStatus] = useState<RawStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<{
    sent: number;
    total: number;
    speed: number;
  } | null>(null);
  const [error, setError] = useState<{
    message: string;
    canResume: boolean;
  } | null>(null);
  const [conflict, setConflict] = useState<{
    uploadId: string;
    filename: string;
    size: number;
  } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const uploaderRef = useRef<RawUploader | null>(null);
  const verifyingIdRef = useRef<string | null>(null);
  const speedRef = useRef<{ t: number; bytes: number; speed: number } | null>(
    null
  );
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await RawUploadService.getStatus(internalId);
      setStatus(s);
      setLoadError(null);
      return s;
    } catch (e: any) {
      setLoadError(e.message || "Could not load raw data status.");
      return null;
    }
  }, [internalId]);

  useEffect(() => {
    load();
  }, [load, submissionStatus]); // e.g. Submit / Withdraw changes "editable"

  // Reloaded while the server was already verifying → keep waiting for it.
  useEffect(() => {
    if (phase === "idle" && status?.activeUpload?.status === "verifying") {
      verifyingIdRef.current = status.activeUpload.uploadId;
      setPhase("verifying");
    }
  }, [status, phase]);

  // Verifying: poll until the new ZIP is attached, or the upload ended
  // without it (failed / cancelled / expired). raw_id = upload_id on the
  // server, so "attached" means current.rawId === the upload id.
  useEffect(() => {
    if (phase !== "verifying") return;
    const id = verifyingIdRef.current;
    const timer = setInterval(async () => {
      const s = await load();
      if (!s || !id) return;
      const attached = s.current?.rawId === id;
      const stillActive = s.activeUpload?.uploadId === id;
      if (!attached && stillActive) return;
      clearInterval(timer);
      uploaderRef.current = null;
      setProgress(null);
      setPhase("idle");
      if (attached && s.current) {
        setSuccess(
          `${s.current.filename || "The ZIP"} (${formatBytes(
            s.current.size
          )}) is verified and attached to this version.`
        );
      } else if (s.lastUpload?.uploadId === id) {
        setError({
          message: s.lastUpload.error || "The upload could not be completed.",
          canResume: false,
        });
      }
      onChanged?.();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [phase, load, onChanged]);

  // Closing the tab mid-upload: ask first (the browser shows its own text).
  useEffect(() => {
    if (phase !== "uploading" && phase !== "starting") return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  // Leaving this page inside the app: stop sending (resumable later).
  useEffect(
    () => () => {
      uploaderRef.current?.pause();
    },
    []
  );

  const trackSpeed = (sent: number) => {
    const now = performance.now();
    const prev = speedRef.current;
    if (!prev) {
      speedRef.current = { t: now, bytes: sent, speed: 0 };
      return 0;
    }
    if (now - prev.t < 500) return prev.speed;
    const instant = (sent - prev.bytes) / ((now - prev.t) / 1000);
    const speed = prev.speed ? 0.3 * instant + 0.7 * prev.speed : instant;
    speedRef.current = { t: now, bytes: sent, speed };
    return speed;
  };

  const startUpload = async (file: File) => {
    setSuccess(null);
    setError(null);
    setConflict(null);
    if (!/\.zip$/i.test(file.name)) {
      return setError({
        message: "Please choose a .zip file.",
        canResume: false,
      });
    }
    if (file.size <= 0) {
      return setError({ message: "The file is empty.", canResume: false });
    }
    if (file.size > MAX_BYTES) {
      return setError({
        message: `The file is too large (max ${formatBytes(MAX_BYTES)}).`,
        canResume: false,
      });
    }
    speedRef.current = null;
    setProgress({ sent: 0, total: file.size, speed: 0 });
    setPhase("starting");
    try {
      uploaderRef.current = await RawUploader.begin(internalId, file, {
        onProgress: (sent, total) => {
          setProgress({ sent, total, speed: trackSpeed(sent) });
          setPhase((p) => (p === "starting" ? "uploading" : p));
        },
        onFinished: () => {
          verifyingIdRef.current = uploaderRef.current?.uploadId ?? null;
          setPhase("verifying");
        },
        onError: (message, canResume) => {
          setError({ message, canResume });
          if (canResume) {
            setPhase("paused");
          } else {
            uploaderRef.current = null;
            setProgress(null);
            setPhase("idle");
            load();
          }
        },
      });
      setPhase((p) => (p === "starting" ? "uploading" : p));
      await load();
      onChanged?.(); // readiness now says "upload in progress"
    } catch (e: any) {
      setProgress(null);
      setPhase("idle");
      if (e instanceof RawUploadError && e.code === "ACTIVE_UPLOAD_EXISTS") {
        setConflict(e.details?.upload ?? null);
      } else {
        setError({
          message: e.message || "Could not start the upload.",
          canResume: false,
        });
      }
    }
  };

  const pause = async () => {
    await uploaderRef.current?.pause();
    setPhase("paused");
  };

  const resume = () => {
    setError(null);
    speedRef.current = null;
    setPhase("uploading");
    uploaderRef.current?.resume();
  };

  // The upload to cancel: the one running here, an interrupted one (after a
  // reload), or the one blocking a different file.
  const cancelTargetId =
    uploaderRef.current?.uploadId ||
    status?.activeUpload?.uploadId ||
    conflict?.uploadId ||
    null;

  const cancel = async () => {
    setSuccess(null);
    setConfirmCancel(false);
    setBusy(true);
    try {
      if (uploaderRef.current) await uploaderRef.current.cancel();
      else if (cancelTargetId) {
        await RawUploadService.cancel(internalId, cancelTargetId);
      }
      setError(null);
    } catch (e: any) {
      setError({
        message: e.message || "Could not cancel the upload.",
        canResume: false,
      });
    } finally {
      uploaderRef.current = null;
      setConflict(null);
      setProgress(null);
      setPhase("idle");
      setBusy(false);
      await load();
      onChanged?.();
    }
  };

  const toggleExpected = async (expected: boolean) => {
    setBusy(true);
    try {
      await RawUploadService.setExpected(internalId, expected);
      await load();
      onChanged?.();
    } catch (e: any) {
      setError({ message: e.message, canResume: false });
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Raw data (ZIP)
        </Typography>
        {loadError ? (
          <Alert severity="error">{loadError}</Alert>
        ) : (
          <CircularProgress size={24} />
        )}
      </Paper>
    );
  }

  const { current, activeUpload, lastUpload, editable } = status;
  const sending =
    phase === "starting" || phase === "uploading" || phase === "paused";
  const interrupted =
    !!activeUpload &&
    !uploaderRef.current &&
    phase === "idle" &&
    activeUpload.status !== "verifying";
  const canPick =
    editable && rawUploadSupported && phase === "idle" && !activeUpload;
  const pct =
    progress && progress.total
      ? Math.floor((progress.sent / progress.total) * 100)
      : 0;
  const showLastFailure =
    phase === "idle" &&
    !activeUpload &&
    !error &&
    lastUpload &&
    ["failed", "expired"].includes(lastUpload.status);

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Raw data (ZIP)
      </Typography>

      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess(null)}
          sx={{ mb: 2 }}
        >
          <strong>Raw data uploaded:</strong> {success}
        </Alert>
      )}

      <FormControlLabel
        control={
          <Checkbox
            checked={status.rawZipExpected}
            disabled={
              !editable ||
              busy ||
              !!current ||
              !!activeUpload ||
              phase !== "idle"
            }
            onChange={(e) => toggleExpected(e.target.checked)}
            sx={{ "&.Mui-checked": { color: Colors.purple } }}
          />
        }
        label="This dataset includes raw data"
      />

      {/* Current ZIP */}
      {current ? (
        <Box sx={{ mt: 1, mb: 2, display: "grid", gap: 0.5 }}>
          <Typography variant="body2">
            Current ZIP: <strong>{current.filename || "(unnamed)"}</strong> ·{" "}
            {formatBytes(current.size)} · uploaded{" "}
            {new Date(current.uploadedAt).toLocaleDateString()}
            {current.carriedForward
              ? " · carried over from the previous version"
              : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            SHA-256{" "}
            <code>
              {current.sha256.slice(0, 8)}…{current.sha256.slice(-8)}
            </code>
            <CopyButton value={current.sha256} label="Copy SHA-256" /> ·{" "}
            {EXTRACTION_LABEL[current.extractionStatus]}
          </Typography>
        </Box>
      ) : (
        status.rawZipExpected &&
        !activeUpload &&
        phase === "idle" && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, mb: 2 }}
          >
            No raw ZIP uploaded yet.
          </Typography>
        )
      )}

      {!rawUploadSupported && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This browser can't upload large files. Please use a recent Chrome,
          Firefox, Safari or Edge.
        </Alert>
      )}

      {/* Upload interrupted earlier (e.g. the page was reloaded). */}
      {interrupted && (
        <Alert severity="info" sx={{ mb: 2 }}>
          An upload of <strong>{activeUpload!.filename}</strong> (
          {formatBytes(activeUpload!.size)}) was interrupted. Choose the same
          file to continue, or cancel it.
          {editable && (
            <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => fileInput.current?.click()}
                sx={purpleButton}
              >
                Choose the same file
              </Button>
              <Button
                size="small"
                onClick={() => setConfirmCancel(true)}
                disabled={busy}
                sx={{ color: Colors.darkGray }}
              >
                Cancel upload
              </Button>
            </Box>
          )}
        </Alert>
      )}

      {/* A different file was picked while another upload exists. */}
      {conflict && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Another upload (<strong>{conflict.filename}</strong>,{" "}
          {formatBytes(conflict.size)}) is in progress for this version. Choose
          that same file to continue it, or cancel it to upload a different
          file.
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              onClick={() => setConfirmCancel(true)}
              disabled={busy}
              sx={{ color: Colors.darkGray }}
            >
              Cancel that upload
            </Button>
          </Box>
        </Alert>
      )}

      {/* Progress while sending. */}
      {sending && progress && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {phase === "paused"
              ? "Paused"
              : phase === "starting"
              ? "Starting"
              : "Uploading"}{" "}
            <strong>{uploaderRef.current?.file.name}</strong>
          </Typography>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{
              height: 8,
              borderRadius: 4,
              "& .MuiLinearProgress-bar": { backgroundColor: Colors.purple },
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {pct}% · {formatBytes(progress.sent)} /{" "}
            {formatBytes(progress.total)}
            {phase === "uploading" &&
              progress.speed > 0 &&
              ` · ${formatBytes(progress.speed)}/s · ${formatEta(
                (progress.total - progress.sent) / progress.speed
              )}`}
          </Typography>
          <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
            {phase === "uploading" && (
              <Button
                size="small"
                variant="outlined"
                onClick={pause}
                sx={outlinedPurple}
              >
                Pause
              </Button>
            )}
            {phase === "paused" && (
              <Button
                size="small"
                variant="contained"
                onClick={resume}
                sx={purpleButton}
              >
                Resume
              </Button>
            )}
            <Button
              size="small"
              onClick={() => setConfirmCancel(true)}
              disabled={busy}
              sx={{ color: Colors.darkGray }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      )}

      {phase === "verifying" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">
            Verifying the file — checking it and computing its checksum. This
            can take a while for very large files.
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity={error.canResume ? "warning" : "error"} sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {showLastFailure && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The last upload ({lastUpload!.filename}) didn't finish:{" "}
          {lastUpload!.error || "it expired."}
          {current ? " Your current ZIP is unchanged." : ""}
        </Alert>
      )}

      {canPick && (
        <Button
          variant="contained"
          onClick={() => fileInput.current?.click()}
          sx={purpleButton}
        >
          {current ? "Replace ZIP" : "Choose ZIP file"}
        </Button>
      )}

      {!editable && (
        <Typography variant="body2" color="text.secondary">
          Raw data can only be changed while the submission is a draft or has
          requested changes.
        </Typography>
      )}

      <input
        ref={fileInput}
        type="file"
        accept=".zip,application/zip"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // allow picking the same file again later
          if (f) startUpload(f);
        }}
      />

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)}>
        <DialogTitle>Cancel this upload?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The part already uploaded will be deleted. You can start a new
            upload afterwards.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmCancel(false)}
            sx={{ color: Colors.darkGray }}
          >
            Keep uploading
          </Button>
          <Button variant="contained" onClick={cancel} sx={purpleButton}>
            Cancel upload
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RawDataUploader;
