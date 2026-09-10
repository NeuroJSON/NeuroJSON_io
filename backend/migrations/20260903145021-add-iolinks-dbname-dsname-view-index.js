'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Composite index for the file-type filter's EXISTS subquery in
  // searchAllDatabases:
  //   EXISTS (SELECT 1 FROM iolinks l
  //           WHERE l.dbname = ioviews.dbname AND l.dsname = ioviews.dsname
  //             AND l.view IN (:fileTypes))
  // Without it the planner uses idx_iolinks_dbname alone and scans every row
  // of a database (openneuro ~1.4M), filtering dsname/view in memory — the
  // dominant cost of a subject search combined with a file_type filter. This
  // turns that into a direct lookup on (dbname, dsname, view).
  async up (queryInterface, Sequelize) {
    await queryInterface.addIndex("iolinks", ["dbname", "dsname", "view"], {
      name: "idx_iolinks_dbname_dsname_view",
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "iolinks",
      "idx_iolinks_dbname_dsname_view"
    );
  }
};
