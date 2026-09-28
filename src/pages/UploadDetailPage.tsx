import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DataObjectIcon from "@mui/icons-material/DataObject";
import EditIcon from "@mui/icons-material/Edit";
import SendIcon from "@mui/icons-material/Send";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import CopyButton from "components/CopyButton";
import PublishSettingsDialog from "components/Upload/PublishSettingsDialog";
import { Colors } from "design/theme";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AuthSelector } from "redux/auth/auth.selector";
import { baseURL } from "services/instance";
import {
  Comment,
  UploadDetail,
  UploadRecord,
  UploadService,
} from "services/upload.service";
import RoutesEnum from "types/routes.enum";

type SubStatus = Exclude<UploadRecord["status"], null>;

const STATUS_CHIP: Record<
  SubStatus,
  {
    label: string;
    color?: "default" | "info" | "warning" | "success" | "error";
    sx?: object;
  }
> = {
  draft: { label: "Draft", color: "default" },
  pending: {
    label: "Pending review",
    sx: { backgroundColor: Colors.purple, color: Colors.white },
  },
  changes_requested: { label: "Changes requested", color: "warning" },
  approved: { label: "Approved — awaiting promotion", color: "info" },
  promoted: { label: "Promoted", color: "success" },
  rejected: { label: "Rejected", color: "error" },
};

const formatDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const UploadDetailPage: React.FC = () => {
  const { internalId } = useParams<{ internalId: string }>();
  const { isLoggedIn } = useAppSelector(AuthSelector);
  const navigate = useNavigate();

  const [detail, setDetail] = useState<UploadDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Review actions (submit / resubmit / withdraw).
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (fn: (id: string) => Promise<unknown>) => {
    if (!internalId) return;
    setActing(true);
    setActionError(null);
    try {
      await fn(internalId);
      setDetail(await UploadService.getUpload(internalId)); // refresh status
    } catch (e: any) {
      setActionError(e.message || "Action failed.");
    } finally {
      setActing(false);
    }
  };

  useEffect(() => {
    if (!internalId || !isLoggedIn) return;
    setLoading(true);
    Promise.all([
      UploadService.getUpload(internalId),
      UploadService.listComments(internalId),
    ])
      .then(([d, c]) => {
        setDetail(d);
        setComments(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [internalId, isLoggedIn]);

  const send = async () => {
    const msg = message.trim();
    if (!msg || !internalId) return;
    setPosting(true);
    setPostError(null);
    try {
      const created = await UploadService.postComment(internalId, msg);
      setComments((prev) => [...prev, created]);
      setMessage("");
    } catch (e: any) {
      setPostError(e.message || "Failed to post comment.");
    } finally {
      setPosting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Container maxWidth="sm" sx={{ mt: 6, mb: 6 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
            Please log in
          </Typography>
          <Button
            variant="contained"
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

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !detail) {
    return (
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Alert severity="error">{error || "Dataset not found."}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/dashboard?tab=uploads")}
          sx={{ mt: 2, color: Colors.purple }}
        >
          Back to my uploads
        </Button>
      </Container>
    );
  }

  const chip = detail.status ? STATUS_CHIP[detail.status] : null;
  const canEditSettings =
    (detail.status === "draft" || detail.status === "changes_requested") &&
    !detail.dataset_id;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/dashboard?tab=uploads")}
        sx={{ mb: 2, color: Colors.lightGray }}
      >
        Back to my uploads
      </Button>

      {/* Header / metadata */}
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
          {chip && (
            <Chip
              label={chip.label}
              color={chip.color}
              size="small"
              sx={{ ...(chip.sx || {}) }}
            />
          )}
        </Box>

        <Box sx={{ display: "grid", gap: 0.75, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Public dataset ID:{" "}
            {detail.dataset_id ? (
              <code>{detail.dataset_id}</code>
            ) : (
              <em>Not yet assigned</em>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Internal reference: <code>{detail.internal_id}</code>
            <CopyButton value={detail.internal_id} label="Copy reference" />
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Submitted {formatDate(detail.created_at)}
            {detail.updated_at && detail.updated_at !== detail.created_at
              ? ` · updated ${formatDate(detail.updated_at)}`
              : ""}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {/* Locked while pending/approved; rejected/promoted use Update to
              start a new version. */}
          {detail.status !== "pending" && detail.status !== "approved" && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() =>
                navigate(`/upload?internalId=${detail.internal_id}`)
              }
              sx={{ color: Colors.purple, borderColor: Colors.purple }}
            >
              Update
            </Button>
          )}
          {/* Opens the stored doc via our owner-checked backend proxy (the
              sandbox CouchDB URL is never exposed to the browser). */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<DataObjectIcon />}
            href={`${baseURL}/uploads/${detail.internal_id}/document`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: Colors.purple, borderColor: Colors.purple }}
          >
            View submitted JSON
          </Button>
          {detail.status === "promoted" &&
            detail.promoted_db &&
            detail.dataset_id && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={() =>
                  navigate(`/db/${detail.promoted_db}/${detail.dataset_id}`)
                }
                sx={{ color: Colors.darkGreen, borderColor: Colors.darkGreen }}
              >
                View live
              </Button>
            )}
        </Box>
      </Paper>

      {/* Publishing settings: editable while draft/changes_requested and not
          yet published (the public URL is fixed once a public ID exists). */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
          }}
        >
          <Typography variant="h6">Publishing settings</Typography>
          {canEditSettings && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => setSettingsOpen(true)}
              sx={{ color: Colors.purple, borderColor: Colors.purple }}
            >
              Edit
            </Button>
          )}
        </Box>
        <Box sx={{ display: "grid", gap: 0.75 }}>
          <Typography variant="body2" color="text.secondary">
            Database: <code>{detail.requested_db || "public"}</code>
            {(detail.requested_db || "public") === "public" ? " (default)" : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dataset ID:{" "}
            {detail.requested_dataset_id ? (
              <>
                <code>{detail.requested_dataset_id}</code> (preferred)
              </>
            ) : (
              <em>Assigned by NeuroJSON after approval</em>
            )}
          </Typography>
          {detail.dataset_id && (
            <Typography variant="body2" color="text.secondary">
              Locked — this dataset is published, so its address can't change.
            </Typography>
          )}
        </Box>
      </Paper>

      <PublishSettingsDialog
        open={settingsOpen}
        internalId={detail.internal_id}
        currentDb={detail.requested_db}
        currentId={detail.requested_dataset_id}
        onClose={() => setSettingsOpen(false)}
        onSaved={async () => {
          setSettingsOpen(false);
          if (internalId) setDetail(await UploadService.getUpload(internalId));
        }}
      />

      {/* Review: readiness checklist + submit / resubmit / withdraw */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          Review
        </Typography>

        <Typography
          variant="body2"
          sx={{
            mb: 1,
            color:
              detail.json_status === "failed"
                ? Colors.error
                : Colors.textPrimary,
          }}
        >
          {detail.json_status === "failed"
            ? `✗ ${detail.json_error || "The last JSON update failed."}`
            : `✓ JSON uploaded${
                detail.json_uploaded_at
                  ? ` (${new Date(detail.json_uploaded_at).toLocaleString()})`
                  : ""
              }`}
        </Typography>

        {(detail.status === "draft" ||
          detail.status === "changes_requested") && (
          <>
            {!detail.readiness.canSubmit && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                {detail.readiness.problems.join(" ")}
              </Alert>
            )}
            <Button
              variant="contained"
              disabled={acting || !detail.readiness.canSubmit}
              onClick={() => runAction(UploadService.submitForReview)}
              sx={{
                backgroundColor: Colors.purple,
                "&:hover": { backgroundColor: Colors.secondaryPurple },
              }}
            >
              {detail.status === "changes_requested"
                ? "Resubmit for review"
                : "Submit for review"}
            </Button>
          </>
        )}

        {detail.status === "pending" && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2" sx={{ color: Colors.textSecondary }}>
              Waiting for review
              {detail.submitted_at
                ? ` · submitted ${new Date(
                    detail.submitted_at
                  ).toLocaleString()}`
                : ""}
              . Withdraw it to make changes.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              disabled={acting}
              onClick={() => runAction(UploadService.withdraw)}
              sx={{ color: Colors.purple, borderColor: Colors.purple }}
            >
              Withdraw to draft
            </Button>
          </Box>
        )}

        {detail.status === "approved" && (
          <Typography variant="body2" sx={{ color: Colors.textSecondary }}>
            Approved and waiting to be published. It can't be changed now.
          </Typography>
        )}

        {actionError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {actionError}
          </Alert>
        )}
      </Paper>

      {/* Conversation */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Review discussion
        </Typography>

        {comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No messages yet. Use the box below to reply to the review team.
          </Typography>
        ) : (
          <Box sx={{ mb: 2 }}>
            {comments.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  justifyContent: c.is_owner ? "flex-end" : "flex-start",
                  mb: 1.5,
                }}
              >
                <Box
                  sx={{
                    maxWidth: "75%",
                    bgcolor: c.is_owner ? Colors.purple : Colors.lightGray,
                    color: c.is_owner ? Colors.white : Colors.textPrimary,
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
                      color: c.is_owner ? Colors.white : Colors.textSecondary,
                      opacity: c.is_owner ? 0.9 : 0.75,
                    }}
                  >
                    {c.is_owner ? "You" : "Reviewer"} ·{" "}
                    {new Date(c.created_at).toLocaleString()}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "pre-wrap",
                      color: c.is_owner ? Colors.white : Colors.textPrimary,
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
          label="Write a reply"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
            disabled={!message.trim() || posting}
            onClick={send}
            sx={{
              backgroundColor: Colors.purple,
              "&:hover": { backgroundColor: Colors.secondaryPurple },
            }}
          >
            {posting ? (
              <CircularProgress size={20} sx={{ color: "white" }} />
            ) : (
              "Send"
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default UploadDetailPage;
