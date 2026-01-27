const { Collection, CollectionDataset, Dataset, User } = require("../models");

// Get all collections for current user
const getUserCollections = async (req, res) => {
  try {
    const userId = req.user.id;

    const collections = await Collection.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Dataset,
          as: "datasets",
          through: { attributes: ["created_at"] },
          attributes: ["id", "couch_db", "ds_id", "views_count"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    // Transform to include dataset count
    const collectionsWithCount = collections.map((col) => ({
      id: col.id,
      name: col.name,
      description: col.description,
      is_public: col.is_public,
      created_at: col.created_at,
      updated_at: col.updated_at,
      datasets_count: col.datasets ? col.datasets.length : 0,
      datasets: col.datasets, // Include full dataset details
    }));

    res.status(200).json({
      collections: collectionsWithCount,
      count: collectionsWithCount.length,
    });
  } catch (error) {
    console.error("Get collections error:", error);
    res.status(500).json({
      message: "Error fetching collections",
      error: error.message,
    });
  }
};

// Create a new collection
const createCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, is_public } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Collection name is required" });
    }

    // Check if collection name already exists for this user
    const existing = await Collection.findOne({
      where: { user_id: userId, name: name.trim() },
    });

    if (existing) {
      return res.status(400).json({
        message: "A collection with this name already exists",
      });
    }

    const collection = await Collection.create({
      user_id: userId,
      name: name.trim(),
      description: description?.trim() || null,
      is_public: is_public || false,
    });

    res.status(201).json({
      message: "Collection created successfully",
      collection,
    });
  } catch (error) {
    console.error("Create collection error:", error);
    res.status(500).json({
      message: "Error creating collection",
      error: error.message,
    });
  }
};

// Get a specific collection with its datasets
const getCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;

    // Verify collection belongs to user
    const collection = await Collection.findOne({
      where: { id: collectionId, user_id: userId },
      include: [
        {
          model: Dataset,
          as: "datasets",
          through: { attributes: ["created_at"] },
          attributes: ["id", "couch_db", "ds_id", "views_count"],
        },
      ],
    });

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    res.status(200).json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        is_public: collection.is_public,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        datasets: collection.datasets || [],
        datasets_count: collection.datasets ? collection.datasets.length : 0,
      },
    });
  } catch (error) {
    console.error("Get collection error:", error);
    res.status(500).json({
      message: "Error fetching collection",
      error: error.message,
    });
  }
};

// Add dataset to collection
const addDatasetToCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    const { dbName, datasetId } = req.body;

    if (!dbName || !datasetId) {
      return res.status(400).json({
        message: "dbName and datasetId are required",
      });
    }

    // Verify collection belongs to user
    const collection = await Collection.findOne({
      where: { id: collectionId, user_id: userId },
    });

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    // Get or create dataset
    let dataset = await Dataset.findOne({
      where: { couch_db: dbName, ds_id: datasetId },
    });

    if (!dataset) {
      dataset = await Dataset.create({
        couch_db: dbName,
        ds_id: datasetId,
        views_count: 0,
      });
    }

    // Check if already in collection
    const existing = await CollectionDataset.findOne({
      where: { collection_id: collectionId, dataset_id: dataset.id },
    });

    if (existing) {
      return res.status(400).json({
        message: "Dataset already in this collection",
      });
    }

    // Add to collection
    await CollectionDataset.create({
      collection_id: collectionId,
      dataset_id: dataset.id,
    });

    res.status(201).json({
      message: "Dataset added to collection successfully",
    });
  } catch (error) {
    console.error("Add dataset to collection error:", error);
    res.status(500).json({
      message: "Error adding dataset to collection",
      error: error.message,
    });
  }
};

// Remove dataset from collection
const removeDatasetFromCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId, datasetId } = req.params;

    // Verify collection belongs to user
    const collection = await Collection.findOne({
      where: { id: collectionId, user_id: userId },
    });

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    // Remove from collection (datasetId here is the Dataset.id, not ds_id)
    const deleted = await CollectionDataset.destroy({
      where: { collection_id: collectionId, dataset_id: datasetId },
    });

    if (deleted === 0) {
      return res.status(404).json({
        message: "Dataset not found in this collection",
      });
    }

    res.status(200).json({
      message: "Dataset removed from collection successfully",
    });
  } catch (error) {
    console.error("Remove dataset from collection error:", error);
    res.status(500).json({
      message: "Error removing dataset from collection",
      error: error.message,
    });
  }
};

// Update collection (rename, change description)
const updateCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;
    const { name, description, is_public } = req.body;

    const collection = await Collection.findOne({
      where: { id: collectionId, user_id: userId },
    });

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    if (name !== undefined) {
      // Check for duplicate name
      const existing = await Collection.findOne({
        where: {
          user_id: userId,
          name: name.trim(),
          id: { [require("sequelize").Op.ne]: collectionId }, // Exclude current collection
        },
      });

      if (existing) {
        return res.status(400).json({
          message: "A collection with this name already exists",
        });
      }

      collection.name = name.trim();
    }

    if (description !== undefined) {
      collection.description = description?.trim() || null;
    }

    if (is_public !== undefined) {
      collection.is_public = is_public;
    }

    await collection.save();

    res.status(200).json({
      message: "Collection updated successfully",
      collection,
    });
  } catch (error) {
    console.error("Update collection error:", error);
    res.status(500).json({
      message: "Error updating collection",
      error: error.message,
    });
  }
};

// Delete collection
const deleteCollection = async (req, res) => {
  try {
    const userId = req.user.id;
    const { collectionId } = req.params;

    const collection = await Collection.findOne({
      where: { id: collectionId, user_id: userId },
    });

    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    // Cascade delete will automatically remove collection_datasets entries
    await collection.destroy();

    res.status(200).json({
      message: "Collection deleted successfully",
    });
  } catch (error) {
    console.error("Delete collection error:", error);
    res.status(500).json({
      message: "Error deleting collection",
      error: error.message,
    });
  }
};

// Check which collections contain a specific dataset
const getDatasetCollections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { dbName, datasetId } = req.params;

    // Find the dataset
    const dataset = await Dataset.findOne({
      where: { couch_db: dbName, ds_id: datasetId },
    });

    if (!dataset) {
      return res.status(200).json({
        collections: [],
      });
    }

    // Find all user's collections that contain this dataset
    const collectionDatasets = await CollectionDataset.findAll({
      where: { dataset_id: dataset.id },
      include: [
        {
          model: Collection,
          where: { user_id: userId },
          attributes: ["id", "name", "description"],
        },
      ],
    });

    const collections = collectionDatasets.map((cd) => ({
      id: cd.Collection.id,
      name: cd.Collection.name,
      description: cd.Collection.description,
      added_at: cd.created_at,
    }));

    res.status(200).json({
      collections,
      count: collections.length,
    });
  } catch (error) {
    console.error("Get dataset collections error:", error);
    res.status(500).json({
      message: "Error fetching dataset collections",
      error: error.message,
    });
  }
};

module.exports = {
  getUserCollections,
  createCollection,
  getCollection,
  addDatasetToCollection,
  removeDatasetFromCollection,
  updateCollection,
  deleteCollection,
  getDatasetCollections, // optional
};
