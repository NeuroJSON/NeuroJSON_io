const {
  Dataset,
  DatasetLike,
  SavedDataset,
  Comment,
  ViewHistory,
  User,
} = require("../models");
const { likeDataset } = require("./activity.controller");

// get user's liked datasets
const getUserLikedDatasets = async (req, res) => {
  try {
    const user = req.user;
    const likeDataset = await DatasetLike.findAll({
      where: { user_id: user.id },
      include: [{ model: Dataset }],
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({ likeDataset });
  } catch (error) {
    console.error("Get liked datasets error:", error);
    res
      .status(500)
      .json({ message: "Error fetching liked datasets", error: error.message });
  }
};

// get user's saved datasets
const getUserSavedDatasets = async (req, res) => {
  try {
    const user = req.user;
    const savedDataset = await SavedDataset.findAll({
      where: { user_id: user.id },
      include: [{ model: Dataset, as: "Dataset" }],
      order: [["created_at", "DESC"]],
    });
    res.status(200).json({ savedDataset });
  } catch (error) {
    console.error("Get saved datasets error:", error);
    res
      .status(500)
      .json({ message: "Error fetching saved datasets", error: error.message });
  }
};

// get user's comments
const getUserComments = async (req, res) => {
  try {
    const user = req.user;
    const comments = await Comment.findAll({
      where: { user_id: user.id },
      include: [{ model: Dataset, as: "Dataset" }],
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({ comments });
  } catch (error) {
    console.error("Get user comments error:", error);
    res
      .status(500)
      .json({ message: "Error fetching user comments", error: error.message });
  }
};

// get user's recently viewed datasets
const getUserRecentlyViewed = async (req, res) => {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit) || 6;

    const recentViews = await ViewHistory.findAll({
      where: { user_id: user.id },
      include: [
        {
          model: Dataset,
          attributes: ["id", "couch_db", "ds_id", "views_count"],
        },
      ],
      order: [["viewed_at", "DESC"]],
      limit: limit,
    });

    // map to cleaner format
    // const datasets = recentViews.map((view) => ({
    //   dbName: view.Dataset.couch_db,
    //   datasetId: view.Dataset.ds_id,
    //   views_count: view.Dataset.views_count,
    //   last_viewed: view.viewed_at,
    // }));

    res.status(200).json({
      recentViews,
      datasetsCount: recentViews.length,
      //   recentlyViewed: datasets,
    });
  } catch (error) {
    console.error("Get recently viewed error:", error);
    res.status(500).json({
      message: "Error fetching recently viewed datasets",
      error: error.message,
    });
  }
};

module.exports = {
  getUserLikedDatasets,
  getUserSavedDatasets,
  getUserComments,
  getUserRecentlyViewed,
};
