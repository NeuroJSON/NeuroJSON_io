"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("view_history", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      dataset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "datasets",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      viewed_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for common queries
    await queryInterface.addIndex("view_history", ["user_id"]);
    await queryInterface.addIndex("view_history", ["dataset_id"]);
    await queryInterface.addIndex("view_history", ["viewed_at"]);
    await queryInterface.addConstraint("view_history", {
      fields: ["user_id", "dataset_id"],
      type: "unique",
      name: "unique_user_dataset_view",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("view_history");
  },
};
