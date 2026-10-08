'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Which version (submission) the public URL /db/<db>/<dataset_id>/… shows.
  // NULL until the first promotion; a later promotion moves it to the new
  // version. The published db is that submission's promoted_db. The code must
  // only point it at a submission of the SAME dataset (promotion does this in
  // one transaction).
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("dataset_registry", "published_submission_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "submissions", key: "submission_id" },
      onDelete: "SET NULL", // a deleted version stops being the published one
      onUpdate: "CASCADE",
    });
    // Lets Postgres find the referencing row quickly when a submission is deleted.
    await queryInterface.addIndex("dataset_registry", ["published_submission_id"], {
      name: "idx_dataset_registry_published_submission",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "dataset_registry",
      "idx_dataset_registry_published_submission"
    );
    await queryInterface.removeColumn("dataset_registry", "published_submission_id");
  },
};
