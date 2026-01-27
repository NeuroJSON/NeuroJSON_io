const express = require("express");
const {
  getUserCollections,
  createCollection,
  getCollection,
  addDatasetToCollection,
  removeDatasetFromCollection,
  updateCollection,
  deleteCollection,
  getDatasetCollections,
} = require("../controllers/collection.controller");
const { restoreUser, requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Apply restoreUser to all routes
router.use(restoreUser);

// Get all user's collections
router.get("/me/collections", requireAuth, getUserCollections);

// Create new collection
router.post("/collections", requireAuth, createCollection);

// Get specific collection
router.get("/collections/:collectionId", requireAuth, getCollection);

// Add dataset to collection
router.post(
  "/collections/:collectionId/datasets",
  requireAuth,
  addDatasetToCollection
);

// Remove dataset from collection
router.delete(
  "/collections/:collectionId/datasets/:datasetId",
  requireAuth,
  removeDatasetFromCollection
);

// Update collection
router.put("/collections/:collectionId", requireAuth, updateCollection);

// Delete collection
router.delete("/collections/:collectionId", requireAuth, deleteCollection);

// Check which collections contain a specific dataset (for the "Add to Collection" menu)
router.get(
  "/datasets/:dbName/:datasetId/collections",
  requireAuth,
  getDatasetCollections
);

module.exports = router;
