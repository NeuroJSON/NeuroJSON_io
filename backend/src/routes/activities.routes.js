// request send to postgres
const express = require("express");
const {
  //   likeDataset,
  //   unlikeDataset,
  //   saveDataset,
  //   unsaveDataset,
  //   addComment,
  //   getComments,
  //   deleteComment,
  //   updateComment,
  //   trackView,
  //   getMostViewedDatasets,
} = require("../controllers/activity.controller");
const { restoreUser, requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// // Apply restoreUser to all routes
// router.use(restoreUser);

// // Like/Unlike routes (require authentication)
// router.post("/datasets/:dbName/:datasetId/like", requireAuth, likeDataset);
// router.delete("/datasets/:dbName/:datasetId/like", requireAuth, unlikeDataset);

// // Save/Unsave routes (require authentication)
// router.post("/datasets/:dbName/:datasetId/save", requireAuth, saveDataset);
// router.delete("/datasets/:dbName/:datasetId/save", requireAuth, unsaveDataset);

// // Comment routes
// router.post("/datasets/:dbName/:datasetId/comments", requireAuth, addComment);
// router.get("/datasets/:dbName/:datasetId/comments", getComments); // Public
// router.put(
//   "/datasets/:dbName/:datasetId/comments/:commentId",
//   requireAuth,
//   updateComment
// );
// router.delete(
//   "/datasets/:dbName/:datasetId/comments/:commentId",
//   requireAuth,
//   deleteComment
// );

// // View tracking
// router.post("/datasets/:dbName/:datasetId/views", requireAuth, trackView);
// router.get("/datasets/most-viewed", getMostViewedDatasets); // Public

module.exports = router;
