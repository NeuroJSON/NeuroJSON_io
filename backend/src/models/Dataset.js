const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database");

class Dataset extends Model {}

Dataset.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    couch_db: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ds_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    views_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: "datasets",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["couch_db", "ds_id"],
      },
    ],
  }
);

module.exports = Dataset;
