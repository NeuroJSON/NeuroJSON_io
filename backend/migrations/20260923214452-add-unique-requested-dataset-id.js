'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // At most one dataset may reserve a given preferred public id (first-come).
  // Partial so the many NULL (no preference) rows don't collide. Backs up the
  // controller's assertRequestedIdFree check against races.
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "CREATE UNIQUE INDEX uq_requested_dataset_id ON dataset_registry (requested_dataset_id) WHERE requested_dataset_id IS NOT NULL;"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uq_requested_dataset_id;"
    );
  }
};
