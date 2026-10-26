'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Draft expiry: a draft with no activity (JSON/ZIP upload, settings change,
  // "Keep this draft") for DRAFT_EXPIRE_DAYS becomes status 'expired' — the row
  // is kept for history; its sandbox JSON and raw ZIP are removed.
  //   last_activity_at — last user activity on this submission
  //   expired_at       — when it expired
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("submissions", "last_activity_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("submissions", "expired_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    // Existing submissions start from their last update.
    await queryInterface.sequelize.query(
      "UPDATE submissions SET last_activity_at = updated_at WHERE last_activity_at IS NULL;"
    );
    // Lets the cleanup job find idle drafts quickly.
    await queryInterface.addIndex(
      "submissions",
      ["status", "last_activity_at"],
      { name: "idx_submissions_status_last_activity" }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "submissions",
      "idx_submissions_status_last_activity"
    );
    await queryInterface.removeColumn("submissions", "expired_at");
    await queryInterface.removeColumn("submissions", "last_activity_at");
  },
};
