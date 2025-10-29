"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("datasets", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      couch_db: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      ds_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      views_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
    });
    // Add unique constraint on couch_db + ds_id
    await queryInterface.addIndex("datasets", ["couch_db", "ds_id"], {
      unique: true,
      name: "datasets_couch_db_ds_id_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("datasets");
  },
};
