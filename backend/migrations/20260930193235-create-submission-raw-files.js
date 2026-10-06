"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Which raw object(s) a dataset version (submission) uses. Composite PK
  // (submission_id, raw_id) so a version could reference several objects in
  // the future. For now a version has at most ONE object, enforced by
  // uq_submission_raw_files_one_per_submission — drop that index to allow
  // several (a path→object rule, e.g. a mount_path column, is then needed).
  // Several versions may point to the same object (carry-forward = a new
  // mapping row, no file copy/link). Deleting a version removes only its
  // mapping; a mapped object can't be deleted (RESTRICT). Code must ensure
  // the object and the submission belong to the same dataset.
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("submission_raw_files", {
      submission_id: {
        type: Sequelize.UUID,
        primaryKey: true, // composite PK part 1
        allowNull: false,
        references: { model: "submissions", key: "submission_id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      raw_id: {
        type: Sequelize.UUID,
        primaryKey: true, // composite PK part 2
        allowNull: false,
        references: { model: "raw_objects", key: "raw_id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Current rule: one raw object per version (drop to allow several).
    await queryInterface.sequelize.query(
      "CREATE UNIQUE INDEX uq_submission_raw_files_one_per_submission ON submission_raw_files (submission_id);"
    );

    // "Which versions use this object?" — for cleanup of unmapped objects.
    await queryInterface.addIndex("submission_raw_files", ["raw_id"], {
      name: "idx_submission_raw_files_raw",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("submission_raw_files");
  },
};
