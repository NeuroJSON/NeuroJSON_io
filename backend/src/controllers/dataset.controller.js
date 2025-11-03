const { data } = require("jquery");
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

// unsave a dataset
const unsaveDataset = async (req, res) => {
  try {
    const user = req.user;
    const { couch_db, ds_id } = req.body;

    const dataset = await Dataset.findOne({
      where: {
        couch_db,
        ds_id,
      },
    });

    if (!dataset) {
      return res.status(404).json({ message: "Dataset not found" });
    }

    const deleted = await SavedDataset.destroy({
      where: {
        user_id: user.id,
        dataset_id: dataset.id,
      },
    });

    if (deleted === 0) {
      return res.status(404).json({ message: "Saved dataset not found" });
    }

    res.status(200).json({ message: "Dataset unsaved successfully" });
  } catch (error) {
    console.error("Unsave dataset error:", error);
    res
      .status(500)
      .json({ message: "Error unsaving dataset", error: error.message });
  }
};

// add a comment to a dataset
const addComment = async (req, res) => {
  try {
    const user = req.user;
    const { couch_db, ds_id, body } = req.body;

    const dataset = await getOrCreateDataset(couch_db, ds_id);

    const comment = await Comment.create({
      user_id: user.id,
      dataset_id: dataset.id,
      body,
    });
    res.status(201).json({ message: "Comment added successfully", comment });
  } catch (error) {
    console.error("Add comment error:", error);
    res
      .status(500)
      .json({ message: "Error adding comment", error: error.message });
  }
};

// get comments for a dataset
const getComments = async (req, res) => {
  try {
    const { couch_db, ds_id } = req.query;
    const dataset = await Dataset.findOne({
      where: {
        couch_db,
        ds_id,
      },
    });

    if (!dataset) {
      return res.status(200).json({ comments: [] });
    }

    const comments = await Comment.findAll({
      where: { dataset_id: dataset.id },
      order: [["created_at", "DESC"]],
    });
    res.status(200).json({ comments });
  } catch (error) {
    console.error("Get comments error:", error);
    res
      .status(500)
      .json({ message: "Error fetching comments", error: error.message });
  }
};

// delete a comment
const deleteComment = async (req, res) => {
  try {
    const user = req.user;
    const { commentId } = req.params; // get comment id from url

    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    if (comment.user_id !== user.id) {
      return res.status(403).json({
        message: "You can only delete your own comments",
      });
    }

    // delete the comment
    await comment.destroy();
    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      message: "Error deleting comment",
      error: error.message,
    });
  }
};

// update a comment
const updateComment = async (req, res) => {
  try {
    const user = req.user;
    const { commentId } = req.params;
    const { body } = req.body;
    // validate - body is required
    if (!body || body.trim() === "") {
      return res.status(400).json({
        message: "Comment body is required",
      });
    }

    // find the comment
    const comment = await Comment.findByPk(commentId);
    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
      });
    }

    // check if user is the owner of the comment
    if (comment.user_id !== user.id) {
      return res.status(403).json({
        message: "You can only update your own comments",
      });
    }

    // update the comment
    comment.body = body;
    await comment.save();

    res.status(200).json({
      message: "Comment updated successfully",
      comment: {
        id: comment.id,
        body: comment.body,
        user_id: comment.user_id,
        dataset_id: comment.dataset_id,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
      },
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({
      message: "Error updating comment",
      error: error.message,
    });
  }
};
