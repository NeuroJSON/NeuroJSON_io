'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // One row per scheduled sync run. Doubles as (1) persistent landing-page
  // stats and (2) sync execution history. Lifecycle: inserted 'running' at
  // sync start; finalized 'success' (with totals) or 'failed' (with error)
  // after the run completes. The latest 'success' row = current NeuroJSON state.
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("stats_history", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      started_at: {
        type: Sequelize.DATE, // TIMESTAMPTZ
        allowNull: false,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.TEXT, // 'running' | 'success' | 'failed'
        allowNull: false,
        defaultValue: "running",
      },
      total_datasets: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      total_subjects: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      total_files: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      total_size_bytes: {
        type: Sequelize.BIGINT,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT, // failure reason when status = 'failed'
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("stats_history");
  }
};
