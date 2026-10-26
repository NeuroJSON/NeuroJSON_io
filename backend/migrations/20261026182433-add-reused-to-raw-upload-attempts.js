'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Same-file dedup: an upload whose ZIP is identical (SHA-256 + size) to an
  // existing raw object of the same dataset ends as status 'reused'; that
  // existing object is linked instead of storing a second copy.
  // raw_id stays NULL for 'reused' (raw_id is only set on 'complete').
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("raw_upload_attempts", "reused_raw_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "raw_objects", key: "raw_id" },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE raw_upload_attempts DROP CONSTRAINT IF EXISTS chk_raw_upload_attempts_status;
      ALTER TABLE raw_upload_attempts ADD CONSTRAINT chk_raw_upload_attempts_status
        CHECK (status IN ('initiated','uploading','verifying','complete','failed','cancelled','expired','reused'));
    `);
  },

  // Fails (on purpose) if 'reused' rows exist, instead of silently losing them.
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE raw_upload_attempts DROP CONSTRAINT IF EXISTS chk_raw_upload_attempts_status;
      ALTER TABLE raw_upload_attempts ADD CONSTRAINT chk_raw_upload_attempts_status
        CHECK (status IN ('initiated','uploading','verifying','complete','failed','cancelled','expired'));
    `);
    await queryInterface.removeColumn("raw_upload_attempts", "reused_raw_id");
  },
};
