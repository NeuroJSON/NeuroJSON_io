import { JSONSchema7 } from "json-schema";

export const baseSchema: JSONSchema7 = {
  title: "",
  type: "object",
  properties: {
    dataset_filters_toggle: {
      type: "null",
      title: "Dataset Filters",
    },
    keyword: {
      title: "Search keyword",
      type: "string",
    },
    // dataset: {
    //   title: "Search dataset",
    //   type: "string",
    // },
    limit: {
      type: "integer",
      title: "Limit",
      minimum: 0,
      default: 50,
    },
    skip: {
      type: "integer",
      title: "Skip",
      minimum: 0,
    },
    subject_filters_toggle: {
      type: "null",
      title: "Subject Filters",
    },
    modality: {
      title: "Modalities",
      type: "string",
      enum: [
        "Structural MRI (anat)",
        "fMRI (func)",
        "DWI (dwi)",
        "Field maps (fmap)",
        "Perfusion (perf)",
        "MEG (meg)",
        "EEG (eeg)",
        "Intracranial EEG (ieeg)",
        "Behavioral (beh)",
        "PET (pet)",
        "microscopy (micr)",
        "fNIRS (nirs)",
        "motion (motion)",
        "behavdata",
        "hpi",
        "Electrophysiology (ephys)", // Add
        "Atlas (atlas)", // Add
        // "NIfTI (nifti)",
        // "Mesh (mesh)",
        "any",
      ],
      default: "any",
    },
    gender: {
      title: "Subject gender",
      type: "string",
      enum: ["male", "female", "unknown", "any"],
      default: "any",
    },
    age_min: {
      title: "Minimum age",
      type: "number",
      minimum: 0,
      maximum: 1000,
    },
    age_max: {
      title: "Maximum age",
      type: "number",
      minimum: 0,
      maximum: 1000,
    },

    sess_min: {
      title: "Minimum session count",
      type: "integer",
      minimum: 0,
      maximum: 1000,
    },
    sess_max: {
      title: "Maximum session count",
      type: "integer",
      minimum: 0,
      maximum: 1000,
    },
    task_min: {
      title: "Minimum task count",
      type: "integer",
      minimum: 0,
      maximum: 1000,
    },
    task_max: {
      title: "Maximum task count",
      type: "integer",
      minimum: 0,
      maximum: 1000,
    },
    run_min: {
      title: "Minimum runs",
      type: "integer",
      minimum: 0,
      maximum: 1000,
    },
    run_max: {
      title: "Maximum runs",
      type: "integer",
      minimum: 0,
      maximum: 1000,
    },
    task_name: {
      title: "Task keywords",
      type: "string",
    },
    type_name: {
      title: "Data type keywords",
      type: "string",
    },
    session_name: {
      title: "Session keywords",
      type: "string",
    },
    run_name: {
      title: "Run keywords",
      type: "string",
    },

    // count: {
    //   title: "Only return total counts",
    //   type: "boolean",
    //   default: false,
    // },
    // unique: {
    //   title: "Only return unique entries",
    //   type: "boolean",
    //   default: false,
    // },
  },
  // required: ["keyword"],
};

// Helper to inject dynamic "database" enum
export const generateSchemaWithDatabaseEnum = (
  databaseEnum: string[]
): JSONSchema7 => {
  return {
    ...baseSchema,
    properties: {
      database: {
        title: "Search database",
        type: "string",
        default: "any",
        enum: databaseEnum,
      },
      ...baseSchema.properties,
    },
  };
};
