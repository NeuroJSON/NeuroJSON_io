import UpdatedDatasetDetailPage from "pages/UpdatedDatasetDetailPage";
import React from "react";
import { useParams } from "react-router-dom";

// Opens the dataset page in preview mode for a not-yet-published dataset:
//   /reviews/:id/preview  → reviewer view of a submission (id = submissionId)
//   /uploads/:id/preview  → the owner's own upload (id = internalId)
// The backend checks the reviewer role / ownership when the JSON is loaded.
const DatasetPreviewPage: React.FC<{ kind: "review" | "upload" }> = ({
  kind,
}) => {
  const { id } = useParams<{ id: string }>();
  return id ? <UpdatedDatasetDetailPage preview={{ kind, id }} /> : null;
};

export default DatasetPreviewPage;
