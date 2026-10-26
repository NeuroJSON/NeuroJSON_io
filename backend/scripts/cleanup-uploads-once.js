// Run ONE upload cleanup pass now and print what happened.
// Usage: node scripts/cleanup-uploads-once.js
require("dotenv").config({ quiet: true });
const { cleanupOnce } = require("../src/jobs/cleanupUploads");
const { sequelize } = require("../src/config/database");

cleanupOnce()
  .then((s) => console.log("summary:", s))
  .catch((e) => console.error("failed:", e.message))
  .finally(() => sequelize.close());
