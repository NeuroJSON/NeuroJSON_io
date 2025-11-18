"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("saved_datasets", {
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add unique constraint to prevent duplicate saves
    await queryInterface.addIndex("saved_datasets", ["user_id", "dataset_id"], {
      unique: true,
      name: "saved_datasets_user_dataset_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("saved_datasets");
  },
};
