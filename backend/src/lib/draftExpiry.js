// Drafts with no activity for DRAFT_EXPIRE_DAYS expire (the cleanup job does
// it); a warning shows for the last DRAFT_WARN_DAYS. Only status 'draft' expires.
// Activity = JSON upload, ZIP upload start, publishing settings change,
// withdraw back to draft, or "Keep this draft" (submissions.last_activity_at).
// Reads a positive whole number of days from .env, or uses the default.
const days = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};
const DRAFT_EXPIRE_DAYS = days("DRAFT_EXPIRE_DAYS", 30);
const DRAFT_WARN_DAYS = days("DRAFT_WARN_DAYS", 7);
const DAY_MS = 24 * 60 * 60 * 1000;

// When this submission's draft will expire (null if it isn't a draft).
const draftExpiresAt = (status, lastActivityAt) =>
  status === "draft" && lastActivityAt
    ? new Date(new Date(lastActivityAt).getTime() + DRAFT_EXPIRE_DAYS * DAY_MS)
    : null;

// When the expiry warning starts showing (null if it isn't a draft).
const draftWarnAt = (status, lastActivityAt) => {
  const exp = draftExpiresAt(status, lastActivityAt);
  return exp ? new Date(exp.getTime() - DRAFT_WARN_DAYS * DAY_MS) : null;
};

module.exports = {
  DRAFT_EXPIRE_DAYS,
  DRAFT_WARN_DAYS,
  draftExpiresAt,
  draftWarnAt,
};
