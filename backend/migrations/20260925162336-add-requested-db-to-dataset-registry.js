'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // The public database a dataset should be published to at promotion.
  // A preference/reservation; defaults to "public" when the user picks nothing.
  // Actual db is resolved/created at promotion (a new name is review-gated).
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("dataset_registry", "requested_db", {
      type: Sequelize.STRING(63),
      allowNull: false,
      defaultValue: "public",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("dataset_registry", "requested_db");
  }
};
