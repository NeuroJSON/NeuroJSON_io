"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // One tus upload of a raw ZIP for a dataset version. Tracks the upload
  // process only — the final size/sha256 live on raw_objects. raw_id is set
  // when REN accepts the verified upload (same transaction that creates the
  // raw_objects row and the submission_raw_files mapping); a repeated
  // completion message sees raw_id already set and does nothing.
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("raw_upload_attempts", {
      upload_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false, // = the tus upload id carried in the upload token
      },
      submission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "submissions", key: "submission_id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "initiated",
        // initiated|uploading|verifying|complete|failed|cancelled|expired
      },
      original_filename: { type: Sequelize.STRING(255), allowNull: true },
      // tus Upload-Length; also used for the size cap, disk check, final check.
      expected_size: { type: Sequelize.BIGINT, allowNull: false },
      error: { type: Sequelize.TEXT, allowNull: true },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      raw_id: {
        type: Sequelize.UUID,
        allowNull: true,
        unique: true, // one upload can never produce two objects
        references: { model: "raw_objects", key: "raw_id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      last_checked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      completed_at: { type: Sequelize.DATE, allowNull: true },
    });

    // Only a completed attempt may point to an object. One direction only:
    // a completed attempt may later have raw_id = NULL if cleanup deletes its
    // (unmapped) object — ON DELETE SET NULL must not violate this check.
    await queryInterface.sequelize.query(`
      ALTER TABLE raw_upload_attempts
        ADD CONSTRAINT chk_raw_upload_attempts_status
          CHECK (status IN ('initiated','uploading','verifying','complete','failed','cancelled','expired')),
        ADD CONSTRAINT chk_raw_upload_attempts_raw_only_when_complete
          CHECK (raw_id IS NULL OR status = 'complete');
    `);

    await queryInterface.addIndex("raw_upload_attempts", ["submission_id"], {
      name: "idx_raw_upload_attempts_submission",
    });
    // Reconciliation scans stale in-progress attempts.
    await queryInterface.addIndex(
      "raw_upload_attempts",
      ["status", "updated_at"],
      { name: "idx_raw_upload_attempts_status" }
    );
    // At most one active upload per version.
    await queryInterface.sequelize.query(
      "CREATE UNIQUE INDEX uq_one_active_raw_upload ON raw_upload_attempts (submission_id) WHERE status IN ('initiated','uploading','verifying');"
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("raw_upload_attempts");
  },
};
