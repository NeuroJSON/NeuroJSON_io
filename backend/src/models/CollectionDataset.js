const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database");

class CollectionDataset extends Model {}

CollectionDataset.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    collection_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "collections",
        key: "id",
      },
    },
    dataset_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "datasets",
        key: "id",
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "collection_datasets",
    timestamps: false,
    underscored: true,
  }
);

module.exports = CollectionDataset;
