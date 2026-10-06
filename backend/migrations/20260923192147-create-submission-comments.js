"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Chronological reviewer <-> submitter discussion for a submission cycle,
  // one row per comment. This is the single source of review discussion
  // (there is no review_note column). Author role is derived at read time
  // (user_id == dataset_registry.owner_user_id => submitter, else reviewer).
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("submission_comments", {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      submission_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "submissions", key: "submission_id" },
        onDelete: "CASCADE", // comments die with their cycle
        onUpdate: "CASCADE",
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT", // a comment must keep a real author
        onUpdate: "CASCADE",
      },
      message: { type: Sequelize.TEXT, allowNull: false },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Serves the read query: WHERE submission_id = ? ORDER BY created_at ASC.
    await queryInterface.addIndex(
      "submission_comments",
      ["submission_id", "created_at"],
      { name: "idx_comments_submission_created" }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("submission_comments");
  },
};
