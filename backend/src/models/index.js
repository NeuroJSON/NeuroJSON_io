const { DataTypes, Model } = require("sequelize");
const { sequelize } = require("../config/database");
const User = require("../models/User");
const Dataset = require("../models/Dataset");
const Collection = require("../models/Collection");
const CollectionDataset = require("../models/CollectionDataset");
const Project = require("../models/Project");

// DatasetLike Model
class DatasetLike extends Model {}

DatasetLike.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
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
    tableName: "dataset_likes",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

// SavedDataset Model
class SavedDataset extends Model {}

SavedDataset.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
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
    tableName: "saved_datasets",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

// Comment Model
class Comment extends Model {}

Comment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
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
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "comments",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// ViewHistory Model
class ViewHistory extends Model {}

ViewHistory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
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
    viewed_at: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    tableName: "view_history",
    timestamps: false,
    underscored: true,
  }
);

// Define Associations
User.hasMany(DatasetLike, { foreignKey: "user_id", as: "likes" });
DatasetLike.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(SavedDataset, { foreignKey: "user_id", as: "savedDatasets" });
SavedDataset.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Comment, { foreignKey: "user_id", as: "comments" });
Comment.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(ViewHistory, { foreignKey: "user_id", as: "viewHistory" });
ViewHistory.belongsTo(User, { foreignKey: "user_id" });

Dataset.hasMany(DatasetLike, { foreignKey: "dataset_id", as: "likes" });
DatasetLike.belongsTo(Dataset, { foreignKey: "dataset_id" });

Dataset.hasMany(SavedDataset, { foreignKey: "dataset_id", as: "savedBy" });
SavedDataset.belongsTo(Dataset, { foreignKey: "dataset_id" });

Dataset.hasMany(Comment, { foreignKey: "dataset_id", as: "comments" });
Comment.belongsTo(Dataset, { foreignKey: "dataset_id" });

Dataset.hasMany(ViewHistory, { foreignKey: "dataset_id", as: "viewHistory" });
ViewHistory.belongsTo(Dataset, { foreignKey: "dataset_id" });

// NEW: Collection Associations
User.hasMany(Collection, { foreignKey: "user_id", as: "collections" });
Collection.belongsTo(User, { foreignKey: "user_id" });

Collection.belongsToMany(Dataset, {
  through: CollectionDataset,
  foreignKey: "collection_id",
  otherKey: "dataset_id",
  as: "datasets",
});

Dataset.belongsToMany(Collection, {
  through: CollectionDataset,
  foreignKey: "dataset_id",
  otherKey: "collection_id",
  as: "collections",
});

CollectionDataset.belongsTo(Collection, { foreignKey: "collection_id" });
Collection.hasMany(CollectionDataset, { foreignKey: "collection_id" });

CollectionDataset.belongsTo(Dataset, { foreignKey: "dataset_id" });
Dataset.hasMany(CollectionDataset, { foreignKey: "dataset_id" });

// NEW: Project Associations
User.hasMany(Project, { foreignKey: "user_id", as: "projects" });
Project.belongsTo(User, { foreignKey: "user_id" });

module.exports = {
  User,
  Dataset,
  DatasetLike,
  SavedDataset,
  Comment,
  ViewHistory,
  Collection,
  CollectionDataset,
  Project,
};
