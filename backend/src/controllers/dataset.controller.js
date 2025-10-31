const {
  Dataset,
  DatasetLike,
  SavedDataset,
  Comment,
  ViewHistory,
} = require("../models");
const COUCHDB_BASE_URL =
  process.env.COUCHDB_BASE_URL || "https://neurojson.org/io";

// get or create dataset in SQL database
const getOrCreateDataset = async (couch_db, ds_id) => {
  let dataset = await Dataset.findOne({
    where: { couch_db, ds_id },
  });

  if (!dataset) {
    dataset = await Dataset.create({
      couch_db,
      ds_id,
      views_count: 0,
    });
  }

  return dataset;
};

// like a dataset
const likeDataset = async (req, res) => {
  try {
    const user = req.user;
    const { couch_db, ds_id } = req.body;
    const dataset = await getOrCreateDataset(couch_db, ds_id);

    // check if already liked
    const existingLike = await DatasetLike.findOne({
      where: { user_id: user.id, dataset_id: dataset.id },
    });

    if (existingLike) {
      return res.status(400).json({
        message: "Dataset already liked",
      });
    }

    await DatasetLike.create({
      user_id: user.id,
      dataset_id: dataset.id,
    });

    res.status(201).json({ message: "Dataset liked successfully" });
  } catch (error) {
    console.error("Like dataset error:", error);
    res
      .status(500)
      .json({ message: "Error liking dataset", error: error.message });
  }
};
