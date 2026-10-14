import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DataObjectIcon from "@mui/icons-material/DataObject";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import CopyButton from "components/CopyButton";
import { STATUS_CHIP } from "components/Upload/statusChip";
import { Colors } from "design/theme";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthSelector } from "redux/auth/auth.selector";
import {
  ReviewComment,
  ReviewDecision,
  ReviewDetail,
  ReviewService,
} from "services/review.service";
import { formatBytes } from "utils/formatBytes";
import { resubmitChanges } from "utils/resubmitChanges";

// Reviewer view of one submission: read it, decide, and talk to the uploader.

const DECISION_TEXT: Record<
  ReviewDecision,
  { button: string; title: string; help: string; required: boolean }
> = {
  approve: {
    button: "Approve",
    title: "Approve this dataset?",
    help: "It will wait for promotion (publishing) and can no longer be changed by the uploader. A message is optional.",
    required: false,
  },
  request_changes: {
    button: "Request changes",
    title: "Request changes",
    help: "Tell the uploader what to change. They can update the dataset and resubmit it.",
    required: true,
  },
  reject: {
    button: "Reject",
    title: "Reject this dataset?",
    help: "Please explain why. The uploader can start a new version, but this one is closed.",
    required: true,
  },
};

// Note for a resubmission: what changed since the last decision.
const RESUBMIT_NOTE = {
  "json+zip":
    "The uploader updated the JSON and replaced the raw ZIP after the last review.",
  json: "The uploader updated the JSON after the last review.",
  zip: "The uploader replaced the raw ZIP after the last review.",
  none: "Resubmitted without changes to the JSON or ZIP. Please check the discussion for their reply.",
};

const formatDate = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const purpleButton = {
  backgroundColor: Colors.purple,
  "&:hover": { backgroundColor: Colors.secondaryPurple },
};

const ReviewPage: React.FC = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { isLoggedIn } = useAppSelector(AuthSelector);
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [decisionMsg, setDecisionMsg] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const [reply, setReply] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!submissionId) return;
    try {
      setDetail(await ReviewService.get(submissionId));
      setError(null);
    } catch (e: any) {
      setError(
        e.status === 403
          ? "Reviewer access required."
          : e.message || "Could not load this submission."
      );
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    if (isLoggedIn) load();
  }, [isLoggedIn, load]);

  const openDecision = (d: ReviewDecision) => {
    setDecision(d);
    setDecisionMsg("");
    setDecisionError(null);
  };

  const confirmDecision = async () => {
    if (!decision || !submissionId) return;
    setDeciding(true);
    setDecisionError(null);
    try {
      await ReviewService.decide(submissionId, decision, decisionMsg.trim());
      setDecision(null);
      await load();
    } catch (e: any) {
      setDecisionError(e.message || "Could not save the decision.");
      if (e.status === 409) await load(); // someone else decided / withdrawn
    } finally {
      setDeciding(false);
    }
  };

  // Publish an approved submission. The backend re-checks everything (raw-file
  // links, allowed/existing database, free ID) and its message is shown as is.
  const confirmPublish = async () => {
    if (!submissionId) return;
    setPublishing(true);
    setPublishError(null);
    try {
      await ReviewService.promote(submissionId);
      setPublishOpen(false);
      await load();
    } catch (e: any) {
      setPublishError(e.message || "Publishing failed.");
      if (e.status === 409) await load(); // already published / no longer approved
    } finally {
      setPublishing(false);
    }
  };

  const sendReply = async () => {
    const msg = reply.trim();
    if (!msg || !submissionId) return;
    setPosting(true);
    setPostError(null);
    try {
      const c: ReviewComment = await ReviewService.comment(submissionId, msg);
      setDetail((d) => (d ? { ...d, comments: [...d.comments, c] } : d));
      setReply("");
    } catch (e: any) {
      setPostError(e.message || "Failed to post the message.");
    } finally {
      setPosting(false);
    }
  };

  const back = (
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={() => navigate("/dashboard?tab=review")}
      sx={{ mb: 2, color: Colors.lightGray }}
    >
      Back to review queue
    </Button>
  );

  if (!isLoggedIn) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">Please log in to review submissions.</Alert>
      </Container>
    );
  }
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress sx={{ color: Colors.white }} />
      </Box>
    );
  }
  if (error || !detail) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {back}
        <Alert severity="error">{error || "Submission not found."}</Alert>
      </Container>
    );
  }

  const chip = STATUS_CHIP[detail.status];
  const canDecide = detail.status === "pending" && !detail.is_own;
  // Publish dialog: where it goes and which version it becomes.
  const publishDb = detail.requested_db || "public";
  const publishId =
    detail.dataset_id || detail.requested_dataset_id || "njds######";
  const nextVersion = (detail.live_version || 0) + 1;
  const zip = detail.raw_zip;
  // Resubmitted after a decision: tell the reviewer what changed since then.
  const changes = resubmitChanges({
    status: detail.status,
    reviewed_at: detail.reviewed_at,
    json_uploaded_at: detail.json_uploaded_at,
    raw_zip_uploaded_at: zip ? zip.uploadedAt : null,
  });
  const resubmitNote = changes ? RESUBMIT_NOTE[changes] : null;
  const d = decision ? DECISION_TEXT[decision] : null;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      {back}

      {/* Header */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            mb: 2,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {detail.dataset_name || "(unnamed dataset)"}
          </Typography>
          <Chip
            label={chip.label}
            color={chip.color}
            size="small"
            sx={{ ...(chip.sx || {}) }}
          />
        </Box>
        <Box sx={{ display: "grid", gap: 0.75 }}>
          <Typography variant="body2" color="text.secondary">
            Uploaded by <strong>{detail.owner_username}</strong> (
            {detail.owner_email})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Internal reference: <code>{detail.internal_id}</code>
            <CopyButton value={detail.internal_id} label="Copy reference" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Requested database: <code>{detail.requested_db || "public"}</code>
            {(detail.requested_db || "public") === "public" ? " (default)" : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Preferred dataset ID:{" "}
            {detail.requested_dataset_id ? (
              <code>{detail.requested_dataset_id}</code>
            ) : (
              <em>none — NeuroJSON will assign one (njds######)</em>
            )}
          </Typography>
          {detail.dataset_id && (
            <Typography variant="body2" color="text.secondary">
              Public dataset ID: <code>{detail.dataset_id}</code>
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Permanent address after publishing:{" "}
            <code>
              neurojson.io/db/{detail.requested_db || "public"}/
              {detail.dataset_id || detail.requested_dataset_id || "njds######"}
            </code>
            {!detail.dataset_id &&
              !detail.requested_dataset_id &&
              " (ID assigned at promotion)"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Submitted {formatDate(detail.submitted_at)} · JSON updated{" "}
            {formatDate(detail.json_uploaded_at)}
            {detail.reviewed_at
              ? ` · last reviewed ${formatDate(detail.reviewed_at)}`
              : ""}
          </Typography>
        </Box>
        {!!detail.live_version && detail.status !== "promoted" && (
          <Alert severity="info" sx={{ mt: 2, fontSize: "0.9rem" }}>
            This is a <strong>new version</strong> of a published dataset:{" "}
            <code>
              {detail.requested_db || "public"}/{detail.dataset_id}
            </code>{" "}
            (version {detail.live_version} is live). Publishing it replaces the
            live page; version {detail.live_version} stays available in the
            archive.
          </Alert>
        )}
        {resubmitNote && (
          <Alert severity="info" sx={{ mt: 2, fontSize: "0.9rem" }}>
            {resubmitNote}
          </Alert>
        )}
      </Paper>

      {/* Data */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Data
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DataObjectIcon />}
            href={ReviewService.documentUrl(detail.submission_id)}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: Colors.purple, borderColor: Colors.purple }}
          >
            View submitted JSON
          </Button>
          {/* Same layout as the public dataset page (not published yet) */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<VisibilityIcon />}
            component={Link}
            to={`/reviews/${detail.submission_id}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: Colors.purple, borderColor: Colors.purple }}
          >
            Preview as dataset page
          </Button>
        </Box>
        {zip ? (
          <Box sx={{ display: "grid", gap: 0.5 }}>
            <Typography variant="body2">
              Raw ZIP: <strong>{zip.filename || "(unnamed)"}</strong> ·{" "}
              {formatBytes(zip.size)} · uploaded {formatDate(zip.uploadedAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SHA-256{" "}
              <code>
                {zip.sha256.slice(0, 8)}…{zip.sha256.slice(-8)}
              </code>
              <CopyButton value={zip.sha256} label="Copy SHA-256" /> ·
              extraction: {zip.extractionStatus.replace(/_/g, " ")}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No raw data (ZIP) was uploaded for this version.
          </Typography>
        )}
      </Paper>

      {/* Decision */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Decision
        </Typography>
        {detail.status === "approved" ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2">
              Approved
              {detail.reviewed_at
                ? ` · ${formatDate(detail.reviewed_at)}`
                : ""}{" "}
              · ready to publish.
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                setPublishError(null);
                setPublishOpen(true);
              }}
              sx={purpleButton}
            >
              Publish
            </Button>
          </Box>
        ) : detail.status === "promoted" ? (
          <Typography variant="body2">
            <strong>Published</strong> as{" "}
            <code>
              {detail.promoted_db}/{detail.dataset_id}
            </code>
            {detail.published_version
              ? ` · version ${detail.published_version}`
              : ""}{" "}
            <Button
              size="small"
              component={Link}
              to={`/db/${detail.promoted_db}/${detail.dataset_id}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: Colors.purple }}
            >
              View live
            </Button>
          </Typography>
        ) : detail.is_own && detail.status === "pending" ? (
          <Alert severity="info">
            This is your own upload. Another reviewer needs to decide it.
          </Alert>
        ) : canDecide ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={() => openDecision("approve")}
              sx={purpleButton}
            >
              Approve
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => openDecision("request_changes")}
            >
              Request changes
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => openDecision("reject")}
            >
              Reject
            </Button>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Decision: <strong>{chip.label}</strong>
            {detail.reviewed_at ? ` · ${formatDate(detail.reviewed_at)}` : ""}.
            Nothing to decide right now.
          </Typography>
        )}
      </Paper>

      {/* Discussion */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Review discussion
        </Typography>
        {detail.comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No messages yet.
          </Typography>
        ) : (
          <Box sx={{ mb: 2 }}>
            {detail.comments.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  justifyContent: c.is_owner ? "flex-start" : "flex-end",
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    maxWidth: "75%",
                    bgcolor: c.is_owner ? Colors.lightGray : Colors.purple,
                    color: c.is_owner ? Colors.textPrimary : Colors.white,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      display: "block",
                      // set on the text itself: the theme's Typography color
                      // would otherwise override the bubble's color
                      color: c.is_owner ? Colors.textSecondary : Colors.white,
                      opacity: c.is_owner ? 0.75 : 0.9,
                    }}
                  >
                    {c.username}
                    {c.is_owner ? " (uploader)" : ""} ·{" "}
                    {new Date(c.created_at).toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "pre-wrap",
                      color: c.is_owner ? Colors.textPrimary : Colors.white,
                    }}
                  >
                    {c.message}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        <Divider sx={{ my: 2 }} />
        <TextField
          label="Write a message to the uploader"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        {postError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {postError}
          </Alert>
        )}
        <Box sx={{ mt: 1.5, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            disabled={!reply.trim() || posting}
            onClick={sendReply}
            sx={purpleButton}
          >
            {posting ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Send"
            )}
          </Button>
        </Box>
      </Paper>

      {/* Publish dialog */}
      <Dialog
        open={publishOpen}
        onClose={publishing ? undefined : () => setPublishOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Publish this dataset?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1.5 }}>
            It becomes public at{" "}
            <code>
              neurojson.io/db/{publishDb}/{publishId}
            </code>
            {publishId === "njds######"
              ? " (the ID is assigned when publishing)"
              : ""}
            .
          </DialogContentText>
          <DialogContentText sx={{ mb: 1.5 }}>
            This will be <strong>version {nextVersion}</strong>
            {detail.live_version
              ? ` (version ${detail.live_version} is live and stays in the archive)`
              : ""}
            . A frozen copy of this version is kept. Publishing can't be undone
            from here.
          </DialogContentText>
          {publishError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {publishError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setPublishOpen(false)}
            disabled={publishing}
            sx={{ color: Colors.darkGray }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmPublish}
            disabled={publishing}
            sx={purpleButton}
          >
            {publishing ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Publish"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decision dialog */}
      <Dialog
        open={!!decision}
        onClose={deciding ? undefined : () => setDecision(null)}
        fullWidth
        maxWidth="sm"
      >
        {d && (
          <>
            <DialogTitle>{d.title}</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>{d.help}</DialogContentText>
              <TextField
                label={
                  d.required
                    ? "Message to the uploader (required)"
                    : "Message to the uploader (optional)"
                }
                value={decisionMsg}
                onChange={(e) => setDecisionMsg(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                autoFocus
              />
              {decisionError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {decisionError}
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setDecision(null)}
                disabled={deciding}
                sx={{ color: Colors.darkGray }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={confirmDecision}
                disabled={deciding || (d.required && !decisionMsg.trim())}
                sx={purpleButton}
              >
                {deciding ? (
                  <CircularProgress size={20} sx={{ color: "white" }} />
                ) : (
                  d.button
                )}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default ReviewPage;
