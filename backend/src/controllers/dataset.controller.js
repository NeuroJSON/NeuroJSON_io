const { dataURItoBlob } = require("@rjsf/utils");
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

// unlike a dataset
const unlikeDataset = async (req, res) => {
  try {
    const user = req.user;
    const { couch_db, ds_id } = req.body;

    const dataset = await Dataset.findOne({
      where: { couch_db, ds_id },
    });
    if (!dataset) {
      return res.status(404).json({ message: "Dataset not found" });
    }

    const deleted = await DatasetLike.destroy({
      where: { user_id: user.id, dataset_id: dataset.id },
    });
    if (deleted === 0) {
      return res.status(404).json({ message: "Like not found" });
    }

    res.status(200).json({
      message: "Dataset unliked successfully",
    });
  } catch (error) {
    console.error("Unlike dataset error:", error);
    res
      .status(500)
      .json({ message: "Error unliking dataset", error: error.message });
  }
};

// save a dataset(bookmark)
const saveDataset = async (res, req) => {
  try {
    const user = req.user;
    const { couch_db, ds_id } = req.body;

    const dataset = await getOrCreateDataset(couch_db, ds_id);
    const existingSave = await SavedDataset.findOne({
      where: {
        user_id: user.id,
        dataset_id: dataset.id,
      },
    });

    if (existingSave) {
      return res.status(400).json({ message: "Dataset already saved" });
    }

    await SavedDataset.create({
      user_id: user.id,
      dataset_id: dataset.id,
    });
    res.status(200).json({ message: "Dataset saved successfully" });
  } catch (error) {
    console.error("Save dataset error:", error);
    res
      .status(500)
      .json({ message: "Error saving dataset", error: error.message });
  }
};
