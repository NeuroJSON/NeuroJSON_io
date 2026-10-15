'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Published versions become MAJOR.MINOR (upload/review workflow datasets):
  //   minor (1.0 → 1.1): metadata-only update, same raw ZIP as the live version
  //   major (1.x → 2.0): the data / raw ZIP may change
  // published_version → published_major; new published_minor. Both NULL until
  // the submission is published. Already-published rows become N.0.
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uq_submissions_dataset_published_version;"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE submissions DROP CONSTRAINT IF EXISTS chk_submissions_published_version_positive;"
    );
    await queryInterface.renameColumn(
      "submissions",
      "published_version",
      "published_major"
    );
    await queryInterface.addColumn("submissions", "published_minor", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      "UPDATE submissions SET published_minor = 0 WHERE published_major IS NOT NULL;"
    );
    // Both empty (not published) or both set (major ≥ 1, minor ≥ 0).
    await queryInterface.sequelize.query(`
      ALTER TABLE submissions
        ADD CONSTRAINT chk_submissions_published_major_minor
          CHECK ((published_major IS NULL AND published_minor IS NULL)
              OR (published_major >= 1 AND published_minor >= 0));
    `);
    // Each version number (major.minor) is used once per dataset.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_submissions_dataset_published_major_minor
        ON submissions (dataset_registry_id, published_major, published_minor)
        WHERE published_major IS NOT NULL;
    `);
  },

  // Back to one number. Fails (on purpose) if a dataset has two minors of the
  // same major — they can't share one version number.
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS uq_submissions_dataset_published_major_minor;"
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE submissions DROP CONSTRAINT IF EXISTS chk_submissions_published_major_minor;"
    );
    await queryInterface.removeColumn("submissions", "published_minor");
    await queryInterface.renameColumn(
      "submissions",
      "published_major",
      "published_version"
    );
    await queryInterface.sequelize.query(`
      ALTER TABLE submissions
        ADD CONSTRAINT chk_submissions_published_version_positive
          CHECK (published_version IS NULL OR published_version > 0);
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX uq_submissions_dataset_published_version
        ON submissions (dataset_registry_id, published_version)
        WHERE published_version IS NOT NULL;
    `);
  },
};
