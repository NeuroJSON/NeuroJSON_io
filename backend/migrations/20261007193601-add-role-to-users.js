'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Who may review uploads. "user" = everyone (default); "reviewer" = can see
  // the review queue, approve / request changes / reject, and publish approved
  // submissions. Set by hand with SQL.
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "role", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "user",
    });
    await queryInterface.sequelize.query(
      "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','reviewer'));"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;"
    );
    await queryInterface.removeColumn("users", "role");
  },
};
