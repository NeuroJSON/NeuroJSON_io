"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Permanent record for one logical dataset. `internal_id` is the stable
  // identity for the dataset's whole lifetime and is also the sandbox CouchDB
  // `_id`. `dataset_id` (final public id) is assigned only at promotion.
  async up(queryInterface, Sequelize) {
    // Sequence backing NeuroJSON-generated public ids (njds######). Consumed
    // only at promotion when the user did not request a valid custom id.
    await queryInterface.sequelize.query(
      "CREATE SEQUENCE IF NOT EXISTS neurojson_dataset_seq START 1;"
    );

    await queryInterface.createTable("dataset_registry", {
      internal_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false, // app-generated (crypto.randomUUID); also the sandbox _id
      },
      dataset_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true, // final public id, set at promotion (njds###### or custom)
      },
      requested_dataset_id: {
        type: Sequelize.STRING(63),
        allowNull: true, // user's preferred public id — a preference until promotion
      },
      dataset_name: {
        type: Sequelize.STRING(255),
        allowNull: true, // canonical logical-dataset name
      },
      owner_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT", // don't orphan a dataset's owner
        onUpdate: "CASCADE",
      },
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

    await queryInterface.addIndex("dataset_registry", ["owner_user_id"], {
      name: "idx_registry_owner",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("dataset_registry");
    await queryInterface.sequelize.query(
      "DROP SEQUENCE IF EXISTS neurojson_dataset_seq;"
    );
  },
};
