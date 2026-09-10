'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // One row per dataset-level change detected during an incremental sync.
  // Only the incremental path (processDatasetUpdate / delete branch) writes
  // here — firstSync never logs, so a full/first sync does not mass-record
  // every dataset as "added". Powers the "latest update" board on the landing
  // page. history_id → stats_history.id (the sync run that produced the change).
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("dataset_changes", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      history_id: {
        type: Sequelize.INTEGER, // FK → stats_history.id (same INTEGER type)
        allowNull: false,
        references: { model: "stats_history", key: "id" },
        onDelete: "CASCADE",
      },
      dbname: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      dsname: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      change_type: {
        type: Sequelize.TEXT, // 'added' | 'updated' | 'deleted'
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Dedupe: one logical change per dataset per sync run (a dataset touched
    // multiple times in one sync → ON CONFLICT DO NOTHING on this key).
    await queryInterface.addIndex(
      "dataset_changes",
      ["history_id", "dbname", "dsname"],
      { name: "uq_dataset_changes_run_dataset", unique: true }
    );
    // "latest update" lookup filters/groups by run.
    await queryInterface.addIndex("dataset_changes", ["history_id"], {
      name: "idx_dataset_changes_history_id",
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("dataset_changes");
  }
};
