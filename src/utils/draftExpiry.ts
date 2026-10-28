// Days left before a draft is removed, or null if no warning is due yet.
export const daysUntilExpiry = (
  expiresAt?: string | null,
  warnAt?: string | null
): number | null => {
  if (!expiresAt || !warnAt || Date.now() < new Date(warnAt).getTime()) {
    return null;
  }
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
  );
};

export const daysLeftLabel = (days: number) =>
  days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`;
