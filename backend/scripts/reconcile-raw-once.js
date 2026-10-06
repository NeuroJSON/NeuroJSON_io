// Run ONE raw-upload reconciliation pass now and print what happened.
// Usage: node scripts/reconcile-raw-once.js
require("dotenv").config({ quiet: true });
const { reconcileOnce } = require("../src/jobs/reconcileRawUploads");
const { sequelize } = require("../src/config/database");

reconcileOnce()
  .then((s) => console.log("summary:", s))
  .catch((e) => console.error("failed:", e.message))
  .finally(() => sequelize.close());
