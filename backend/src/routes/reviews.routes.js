const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireReviewer } = require("../middleware/requireReviewer");
const {
  listReviews,
  getReview,
  getReviewDocument,
  decide,
  postReviewComment,
} = require("../controllers/reviews.controller");

const router = express.Router();

// Every review route: logged in AND reviewer/admin (role read from the DB).
router.use(requireAuth, requireReviewer);

router.get("/", listReviews);
router.get("/:submissionId", getReview);
router.get("/:submissionId/document", getReviewDocument);
router.post("/:submissionId/decision", decide);
router.post("/:submissionId/comments", postReviewComment);

module.exports = router;
