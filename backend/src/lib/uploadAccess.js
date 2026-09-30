// Shared by uploads.controller.js and rawUploads.controller.js.
const { sequelize } = require("../config/database");

// Errors thrown inside handlers/transactions to signal a specific HTTP response.
class HttpError extends Error {
  constructor(status, body) {
    super(typeof body === "string" ? body : body.error || "error");
    this.status = status;
    this.body = typeof body === "string" ? { error: body } : body;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Load a registry row the caller owns, or throw (404 unknown, 403 not owner).
// Guards the UUID format first so a bad param can't crash the SQL uuid cast.
const loadOwnedRegistry = async (internalId, userId) => {
  if (!UUID_RE.test(internalId)) {
    throw new HttpError(404, { error: "Dataset not found" });
  }
  const rows = await sequelize.query(
    `SELECT internal_id, dataset_id, requested_dataset_id, requested_db, dataset_name, owner_user_id
       FROM dataset_registry WHERE internal_id = :iid`,
    { replacements: { iid: internalId }, type: sequelize.QueryTypes.SELECT }
  );
  if (rows.length === 0) throw new HttpError(404, { error: "Dataset not found" });
  if (rows[0].owner_user_id !== userId) {
    throw new HttpError(403, { error: "This dataset belongs to another user" });
  }
  return rows[0];
};

module.exports = { HttpError, UUID_RE, loadOwnedRegistry };
