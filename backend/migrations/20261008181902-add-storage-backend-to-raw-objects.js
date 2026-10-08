'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Which storage system holds this raw object (a short name, e.g. "zodiac").
  // The address/keys for each name live in the backend .env, not here, so
  // moving or adding storage never changes published URLs. No CHECK list on
  // purpose: adding a storage system shouldn't need a migration — the code
  // checks the name against the configured backends.
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("raw_objects", "storage_backend", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "zodiac", // existing rows are all on Zodiac
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("raw_objects", "storage_backend");
  },
};
