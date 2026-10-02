// Signed calls from Zodiac to REN. Classifies the answer for the outbox:
//   ok        → 2xx with a JSON body
//   retry     → network error / timeout / 5xx (try again later)
//   permanent → 4xx (retrying won't help: wrong keys, unknown upload, …)
import { config } from "../config.js";
import { signRequest } from "./storageSignature.js";

export const pushEnabled = () => Boolean(config.mainApiUrl);

export const sendUploadEvent = async (uploadId, payload) => {
  const url = new URL(
    `${config.mainApiUrl}/internal/storage/uploads/${uploadId}/events`
  );
  const body = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    // REN verifies against its req.originalUrl, i.e. this exact path + query.
    ...signRequest(
      { method: "POST", path: url.pathname + url.search, body },
      config.hmacKeys,
      config.hmacActiveKid
    ),
  };
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    return { kind: "retry", error: `network: ${e.message}` };
  }
  const text = await res.text();
  if (res.ok) {
    try {
      return { kind: "ok", body: JSON.parse(text) };
    } catch {
      return { kind: "retry", error: "REN sent a non-JSON reply" };
    }
  }
  if (res.status >= 500) {
    return { kind: "retry", error: `REN HTTP ${res.status}` };
  }
  return {
    kind: "permanent",
    error: `REN HTTP ${res.status}: ${text.slice(0, 200)}`,
  };
};
