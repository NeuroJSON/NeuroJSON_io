'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Version number of a PUBLISHED submission within its dataset (1, 2, 3, …).
  // NULL until the submission is published. Set when promotion reserves the
  // public ID, so a retry keeps the same number. Used for:
  //   - the frozen copy in the archive db:  <db>:<dataset_id>:v<n>
  //   - version-pinned raw-file links:      /api/v1/files/<db>/<dataset_id>@v<n>/<path>
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("submissions", "published_version", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.sequelize.query(`
      ALTER TABLE submissions
        ADD CONSTRAINT chk_submissions_published_version_positive
          CHECK (published_version IS NULL OR published_version > 0);
    `);
    // Each version number is used once per dataset (NULLs don't count).
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_submissions_dataset_published_version
        ON submissions (dataset_registry_id, published_version)
        WHERE published_version IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uq_submissions_dataset_published_version;"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE submissions DROP CONSTRAINT IF EXISTS chk_submissions_published_version_positive;"
    );
    await queryInterface.removeColumn("submissions", "published_version");
  },
};
