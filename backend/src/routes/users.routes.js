const express = require("express");
const {
  getUserSavedDatasets,
  getUserLikedDatasets,
  getUserComments,
  getUserRecentlyViewed,
} = require("../controllers/dataset.controller");
const { restoreUser, requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Apply authentication middleware to all user routes
router.use(restoreUser);
router.use(requireAuth);

// User collections
router.get("/me/saved-datasets", getUserSavedDatasets);
router.get("/me/liked-datasets", getUserLikedDatasets);
router.get("/me/comments", getUserComments);
router.get("/me/recently-viewed", getUserRecentlyViewed);

module.exports = router;
