'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Cleanup of raw ZIPs no version needs (replaced, or only used by
  // rejected/expired submissions):
  //   unused_since        — when the cleanup job first saw it unused (cleared
  //                         if it is used again); deleted after RAW_CLEANUP_DAYS
  //   delete_requested_at — deletion started; such an object may never be
  //                         linked again. zip_deleted_at is set once storage confirms.
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("raw_objects", "unused_since", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("raw_objects", "delete_requested_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("raw_objects", "delete_requested_at");
    await queryInterface.removeColumn("raw_objects", "unused_since");
  },
};
