'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Who may review uploads. "user" = everyone (default); "reviewer" = can see
  // the review queue and approve / request changes / reject; "admin" = same as
  // reviewer for now (room for later admin-only actions). Set by hand with SQL.
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "role", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "user",
    });
    await queryInterface.sequelize.query(
      "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','reviewer','admin'));"
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;"
    );
    await queryInterface.removeColumn("users", "role");
  },
};
