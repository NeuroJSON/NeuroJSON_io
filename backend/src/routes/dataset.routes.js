const express = require("express");
const {
  likeDataset,
  unlikeDataset,
  saveDataset,
  unsaveDataset,
  addComment,
  getComments,
  deleteComment,
  updateComment,
  trackView,
  getUserSavedDatasets,
  getRecentlyViewed,
} = require("../controllers/dataset.controller");

const { restoreUser, requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Apply restoreUser to all routes
router.use(restoreUser);

// Like/Unlike routes (require authentication)
router.post("/like", requireAuth, likeDataset);
router.delete("/unlike", requireAuth, unlikeDataset);

// Save/Unsave routes (require authentication)
router.post("/save", requireAuth, saveDataset);
router.delete("/unsave", requireAuth, unsaveDataset);
router.get("/saved", requireAuth, getUserSavedDatasets);

// Comment routes
router.post("/comment", requireAuth, addComment);
router.get("/comments", getComments); // Public - no auth required
router.put("/comment/:commentId", requireAuth, updateComment);
router.delete("/comment/:commentId", requireAuth, deleteComment);

// View tracking (require authentication)
router.post("/view", requireAuth, trackView);
router.get("/recently-viewed", requireAuth, getRecentlyViewed);

module.exports = router;
