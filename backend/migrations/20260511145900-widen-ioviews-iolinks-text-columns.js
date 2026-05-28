"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // VARCHAR(n) → TEXT is a metadata-only change in Postgres (no table rewrite,
    // no need to drop the unique constraint or indexes).
    await queryInterface.changeColumn("ioviews", "dbname", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.changeColumn("ioviews", "dsname", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.changeColumn("ioviews", "subj", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.changeColumn("iolinks", "dbname", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.changeColumn("iolinks", "dsname", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.changeColumn("sync_state", "dbname", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("ioviews", "dbname", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.changeColumn("ioviews", "dsname", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.changeColumn("ioviews", "subj", {
      type: Sequelize.STRING(12),
      allowNull: true,
    });
    await queryInterface.changeColumn("iolinks", "dbname", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.changeColumn("iolinks", "dsname", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });
    await queryInterface.changeColumn("sync_state", "dbname", {
      type: Sequelize.STRING(30),
      allowNull: false,
    });
  },
};
