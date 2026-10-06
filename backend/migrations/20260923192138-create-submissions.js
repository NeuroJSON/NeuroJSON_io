"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // One review workflow (cycle) for a logical dataset. Holds only the current
  // status + review/promotion metadata; the reviewer<->submitter discussion
  // lives in submission_comments. A dataset can have many cycles over time,
  // but only ONE open one (see the partial unique index below).
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("submissions", {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      submission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true, // one review cycle; referenced by submission_comments
      },
      dataset_registry_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "dataset_registry", key: "internal_id" },
        onDelete: "CASCADE", // removing the logical dataset removes its cycles
        onUpdate: "CASCADE",
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "pending", // pending|changes_requested|approved|rejected|promoted
      },
      reviewed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL", // keep the cycle if a reviewer is removed
        onUpdate: "CASCADE",
      },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      promoted_db: { type: Sequelize.STRING(255), allowNull: true },
      promoted_at: { type: Sequelize.DATE, allowNull: true },
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
    });

    await queryInterface.addIndex("submissions", ["dataset_registry_id"], {
      name: "idx_submissions_registry",
    });
    await queryInterface.addIndex("submissions", ["status"], {
      name: "idx_submissions_status",
    });

    // At most one OPEN workflow per dataset. "Open" = still active:
    // pending / changes_requested / approved (approved is awaiting promotion,
    // so it must also block a new cycle). rejected/promoted are terminal, so a
    // confirmed resubmit can insert a fresh pending row.
    await queryInterface.sequelize.query(
      "CREATE UNIQUE INDEX uq_one_open_per_dataset ON submissions (dataset_registry_id) WHERE status IN ('pending','changes_requested','approved');"
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("submissions");
  },
};
