"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Draft workflow: review status starts at 'draft'; JSON upload state is
  // tracked separately from review state; raw ZIP is optional per submission.
  async up(queryInterface, Sequelize) {
    // New cycles start as draft (not pending).
    await queryInterface.changeColumn("submissions", "status", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "draft", // draft|pending|changes_requested|approved|rejected|promoted
    });

    // JSON component state (separate from review status).
    await queryInterface.addColumn("submissions", "json_status", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "uploaded", // uploaded | failed
    });
    await queryInterface.addColumn("submissions", "json_uploaded_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("submissions", "json_error", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Last time the user sent it to review (draft/changes_requested → pending).
    await queryInterface.addColumn("submissions", "submitted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Raw ZIP is optional; required for submit only when this is true.
    await queryInterface.addColumn("submissions", "raw_zip_expected", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Existing rows already had their JSON uploaded.
    await queryInterface.sequelize.query(
      "UPDATE submissions SET json_uploaded_at = updated_at WHERE json_uploaded_at IS NULL;"
    );

    // One active cycle per dataset — now including draft.
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uq_one_open_per_dataset;"
    );
    await queryInterface.sequelize.query(
      "CREATE UNIQUE INDEX uq_one_open_per_dataset ON submissions (dataset_registry_id) WHERE status IN ('draft','pending','changes_requested','approved');"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uq_one_open_per_dataset;"
    );
    await queryInterface.sequelize.query(
      "CREATE UNIQUE INDEX uq_one_open_per_dataset ON submissions (dataset_registry_id) WHERE status IN ('pending','changes_requested','approved');"
    );
    await queryInterface.removeColumn("submissions", "raw_zip_expected");
    await queryInterface.removeColumn("submissions", "submitted_at");
    await queryInterface.removeColumn("submissions", "json_error");
    await queryInterface.removeColumn("submissions", "json_uploaded_at");
    await queryInterface.removeColumn("submissions", "json_status");
    await queryInterface.changeColumn("submissions", "status", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "pending",
    });
  },
};
