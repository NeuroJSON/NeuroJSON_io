'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Dataset submission/review workflow tracking (PostgreSQL side).
  // - neurojson_dataset_seq: source of the stable logical dataset id
  //   (formatted 'njds' + 6-digit zero-pad; also the CouchDB _id).
  // - submissions: one row per review workflow. dataset_id is NOT unique
  //   (a dataset can have multiple workflows over time); submission_id IS.
  //   A partial unique index enforces at most one 'pending' workflow per
  //   dataset at a time.
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "CREATE SEQUENCE IF NOT EXISTS neurojson_dataset_seq START 1;"
    );

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
        unique: true, // one review workflow; also creates an index
      },
      dataset_id: {
        type: Sequelize.STRING(255),
        allowNull: false, // e.g. njds000001 — also the CouchDB _id
      },
      dataset_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT", // don't orphan/lose a submission's uploader
        onUpdate: "CASCADE",
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "pending", // pending | approved | rejected | promoted
      },
      reviewed_by: {
        type: Sequelize.INTEGER,
        allowNull: true, // set during review
        references: { model: "users", key: "id" },
        onDelete: "SET NULL", // keep the submission if a reviewer is removed
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

    await queryInterface.addIndex("submissions", ["user_id"], {
      name: "idx_submissions_user_id",
    });
    await queryInterface.addIndex("submissions", ["dataset_id"], {
      name: "idx_submissions_dataset_id",
    });
    await queryInterface.addIndex("submissions", ["status"], {
      name: "idx_submissions_status",
    });
    // At most one pending workflow per dataset (submission_id already indexed
    // via its unique constraint).
    await queryInterface.sequelize.query(
      "CREATE UNIQUE INDEX uq_one_pending_per_dataset ON submissions (dataset_id) WHERE status = 'pending';"
    );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("submissions");
    await queryInterface.sequelize.query(
      "DROP SEQUENCE IF EXISTS neurojson_dataset_seq;"
    );
  }
};
