"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Required by upsertIoview's ON CONFLICT (dbname, dsname, subj, view).
    await queryInterface.addConstraint("ioviews", {
      fields: ["dbname", "dsname", "subj", "view"],
      type: "unique",
      name: "ioviews_dbname_dsname_subj_view_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      "ioviews",
      "ioviews_dbname_dsname_subj_view_unique"
    );
  },
};
