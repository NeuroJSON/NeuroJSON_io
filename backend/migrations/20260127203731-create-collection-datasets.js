'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable("collection_datasets", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      collection_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "collections",
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

    / Add indexes
    await queryInterface.addIndex("collection_datasets", ["collection_id"], {
      name: "collection_datasets_collection_id_idx",
    });

    await queryInterface.addIndex("collection_datasets", ["dataset_id"], {
      name: "collection_datasets_dataset_id_idx",
    });

    await queryInterface.addIndex("collection_datasets", ["collection_id", "dataset_id"], {
      unique: true,
      name: "collection_datasets_unique",
    });

  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable("collection_datasets");
  }
};
