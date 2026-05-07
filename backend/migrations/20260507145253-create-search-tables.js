"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ioviews table
    await queryInterface.createTable("ioviews", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      dbname: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      dsname: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      subj: {
        type: Sequelize.STRING(12),
        allowNull: true,
      },
      view: {
        type: Sequelize.STRING(12),
        allowNull: true,
      },
      json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      search_vector: {
        type: Sequelize.DataTypes.TSVECTOR,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // ioviews indexes
    await queryInterface.addIndex("ioviews", ["view"], {
      name: "idx_ioviews_view",
    });
    await queryInterface.addIndex("ioviews", ["dbname"], {
      name: "idx_ioviews_dbname",
    });
    await queryInterface.addIndex("ioviews", ["updated_at"], {
      name: "idx_ioviews_updated_at",
    });

    // GIN indexes need raw query (not supported by addIndex)
    await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_ioviews_search 
      ON ioviews USING GIN(search_vector);
    CREATE INDEX IF NOT EXISTS idx_ioviews_json 
      ON ioviews USING GIN(json);
  `);

    // iolinks table
    await queryInterface.createTable("iolinks", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      dbname: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      dsname: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      subj: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      view: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      json: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
    });

    // iolinks indexes
    await queryInterface.addIndex("iolinks", ["view"], {
      name: "idx_iolinks_view",
    });
    await queryInterface.addIndex("iolinks", ["dbname"], {
      name: "idx_iolinks_dbname",
    });
    await queryInterface.sequelize.query(`
    CREATE INDEX IF NOT EXISTS idx_iolinks_json 
      ON iolinks USING GIN(json);
  `);

    // sync_state table
    await queryInterface.createTable("sync_state", {
      dbname: {
        type: Sequelize.STRING(30),
        primaryKey: true,
        allowNull: false,
      },
      last_seq: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      synced_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ioviews");
    await queryInterface.dropTable("iolinks");
    await queryInterface.dropTable("sync_state");
  },
};
