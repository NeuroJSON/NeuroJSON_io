// NeuroJSON storage API (Zodiac). Listens on 127.0.0.1; Apache adds TLS and
// proxies /neurojson-storage/* here. /internal routes are added in a later step.
import fs from "node:fs/promises";
import express from "express";
import { config } from "./config.js";
import { tusServer } from "./tus/tusServer.js";

const app = express();
app.disable("x-powered-by");

// Public health check: basic status only (no disk details — those are internal).
app.get(`${config.basePath}/health`, async (req, res) => {
  try {
    await fs.access(config.uploadRoot, fs.constants.W_OK);
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error" });
  }
});

// tus owns everything under /files (POST create, HEAD/PATCH/DELETE
// /files/<id>, and the CORS preflight). No body parser: tus streams the body.
const tusHandler = (req, res) => tusServer.handle(req, res);
app.all(`${config.basePath}/files`, tusHandler);
app.all(`${config.basePath}/files/*splat`, tusHandler);

app.use((req, res) => res.status(404).json({ error: "Not found." }));

const server = app.listen(config.port, config.host, () => {
  console.log(
    `storage-api listening on http://${config.host}:${config.port}${config.basePath}` +
      ` | root ${config.uploadRoot}` +
      ` | pushes ${
        config.mainApiUrl ? "ON → " + config.mainApiUrl : "OFF (pull mode)"
      }`
  );
});

// Let pm2 stop us cleanly (finish in-flight requests).
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
