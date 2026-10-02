// Signed calls from REN to the Zodiac storage API's /internal endpoints
// (HMAC, same scheme as Zodiac → REN). Throws on any non-2xx so callers can
// simply try again on the next run.
const { signRequest } = require("./storageSignature");

const base = () =>
  (
    process.env.STORAGE_INTERNAL_URL ||
    process.env.STORAGE_PUBLIC_URL ||
    ""
  ).replace(/\/+$/, "");

const call = async (method, sub, body) => {
  const url = new URL(`${base()}/internal${sub}`);
  const json = body === undefined ? "" : JSON.stringify(body);
  const headers = {
    ...(json ? { "Content-Type": "application/json" } : {}),
    // Zodiac verifies against its req.originalUrl = this exact path + query.
    ...signRequest({ method, path: url.pathname + url.search, body: json }),
  };
  const res = await fetch(url, {
    method,
    headers,
    body: json || undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `storage ${method} ${sub} → HTTP ${res.status}: ${text.slice(0, 200)}`
    );
  }
  return JSON.parse(text);
};

module.exports = {
  configured: () => Boolean(base()),
  getUpload: (id) => call("GET", `/uploads/${id}`),
  // Forward REN's answer exactly as it would be returned to a push.
  sendDecision: (id, reply) =>
    call("POST", `/uploads/${id}/decision`, {
      decision: reply.decision,
      rawId: reply.rawId,
      storageKey: reply.storageKey,
      reason: reply.reason,
    }),
  sendAck: (id, reply = {}) =>
    call(
      "POST",
      `/uploads/${id}/ack`,
      reply.action ? { action: reply.action, reason: reply.reason } : {}
    ),
  deleteUpload: (id) => call("DELETE", `/uploads/${id}`),
  status: () => call("GET", "/status"),
};
