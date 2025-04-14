import { JSONSchema7 } from "json-schema";

export const baseSchema: JSONSchema7 = {
  // title: "Metadata Search",
  title: "",
  type: "object",
  properties: {
    keyword: {
      title: "Search keyword",
      type: "string",
    },
    // database: {
    //   title: "Search database",
    //   type: "string",
    //   default: "any",
    //   enum: [
    //     "openneuro",
    //     "abide",
    //     "abide2",
    //     "datalad-registry",
    //     "adhd200",
    //     "any",
    //   ],
    // },

    dataset: {
      title: "Search dataset",
      type: "string",
    },
    limit: {
      type: "integer",
      title: "Maximum number of results to return",
      minimum: 0,
      // description: "Set the maximum number of results to return",
    },
    skip: {
      type: "integer",
      title: "Skip the first N(number) results",
      minimum: 0,
      // description: "Set a number N to skip the first N results",
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
    // session_name: {
    //   title: "Session keywords",
    //   type: "string",
    // },
    // run_name: {
    //   title: "Run keywords",
    //   type: "string",
    // },
    type_name: {
      title: "Data type keywords",
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
