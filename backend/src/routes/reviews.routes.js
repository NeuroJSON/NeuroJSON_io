const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireReviewer } = require("../middleware/requireReviewer");
const {
  listReviews,
  getReview,
  getReviewDocument,
  decide,
  postReviewComment,
  promote,
} = require("../controllers/reviews.controller");

const router = express.Router();

// Every review route: logged in AND reviewer (role read from the DB).
router.use(requireAuth, requireReviewer);

router.get("/", listReviews);
// Lets the frontend decide whether to show the Review tab (same check as the
// actions). Must stay before "/:submissionId".
router.get("/access", (req, res) => res.json({ role: req.userRole }));
router.get("/:submissionId", getReview);
router.get("/:submissionId/document", getReviewDocument);
router.post("/:submissionId/decision", decide);
router.post("/:submissionId/comments", postReviewComment);
// Publish an approved submission (writes to COUCHDB_PROMOTE_URL; off if empty).
router.post("/:submissionId/promote", promote);

module.exports = router;
