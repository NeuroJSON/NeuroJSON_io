import { Colors } from "design/theme";
import { getTypeSuggestions } from "./typesByModality";

// Controls the background highlight of selected fields
// Controls the visibility of subject-level filters
export const generateUiSchema = (
  formData: Record<string, any>,
  showSubjectFilters: boolean,
  showDatasetFilters: boolean
) => {
  const activeStyle = {
    "ui:options": {
      style: {
        backgroundColor: Colors.lightBlue,
      },
    },
  };

  // Fully remove a field from the rendered DOM (keeps its value in formData).
  // Using ui:widget: "hidden" produces just an <input type="hidden">, so no
  // empty Grid row + margin is left behind — fixes the big gap between rows.
  const invisibleStyle = {
    "ui:widget": "hidden",
  };

  const hiddenStyle = {
    "ui:options": {
      style: {
        display: showSubjectFilters ? "block" : "none",
      },
    },
  };

  // collapsible sections (subject-level & dataset-level)
  //  const subjectHiddenStyle = {
  //   "ui:options": {
  //     style: { display: showSubjectFilters ? "block" : "none" },
  //   },
  // };

  const datasetHiddenStyle = {
    "ui:options": {
      style: { display: showDatasetFilters ? "block" : "none" },
    },
  };

  return {
    "ui:order": [
      "dataset_filters_toggle", // button first
      "database",
      "keyword",
      "subject_filters_toggle",
      "age_range_slider", // top of subject filters — range slider for age
      "modality",
      "type_name", // sits right after modality — its options depend on it
      "gender",
      "age_min", // hidden via invisibleStyle; written by the slider above
      "age_max",
      "sess_count_range", // sessions min/max on one row
      "sess_min",
      "sess_max",
      "task_count_range", // tasks min/max on one row
      "task_min",
      "task_max",
      "run_count_range", // runs min/max on one row
      "run_min",
      "run_max",
      "task_name",
      "session_name",
      "run_name",
      "limit",
      "skip",
      "*", // anything else not listed
    ],
    // keyword: formData["keyword"] ? activeStyle : {},
    dataset_filters_toggle: { "ui:field": "datasetFiltersToggle" },
    keyword: showDatasetFilters
      ? formData["keyword"]
        ? activeStyle
        : {}
      : datasetHiddenStyle,
    // database:
    //   formData["database"] && formData["database"] !== "any" ? activeStyle : {},
    database: showDatasetFilters
      ? formData["database"] && formData["database"] !== "any"
        ? activeStyle
        : {}
      : datasetHiddenStyle,

    //   dataset: formData["dataset"] ? activeStyle : {},
    //   limit: formData["limit"] ? activeStyle : {},
    //   skip: formData["skip"] ? activeStyle : {},
    limit: invisibleStyle,
    skip: invisibleStyle,

    // subject-level filters
    subject_filters_toggle: {
      "ui:field": "subjectFiltersToggle",
    },
    modality: showSubjectFilters
      ? formData["modality"] && formData["modality"] !== "any"
        ? activeStyle
        : {}
      : hiddenStyle,

    // Age range — slider lives inside the form via the AgeRangeSliderField
    // stable component. age_min/age_max stay in the schema (so the backend
    // gets them on submit) but their default numeric inputs are hidden.
    age_range_slider: showSubjectFilters
      ? { "ui:field": "ageRangeSlider" }
      : hiddenStyle,
    age_min: invisibleStyle,
    age_max: invisibleStyle,

    gender: showSubjectFilters
      ? formData["gender"] && formData["gender"] !== "any"
        ? activeStyle
        : {}
      : hiddenStyle,

    // Session / task / run min+max pairs are rendered by a single
    // CountRangePairField each. The raw integer inputs are hidden but stay in
    // formData so the backend still receives them on submit.
    sess_count_range: showSubjectFilters
      ? {
          "ui:field": "countRangePair",
          "ui:options": {
            minKey: "sess_min",
            maxKey: "sess_max",
            label: "sessions",
          },
        }
      : hiddenStyle,
    sess_min: invisibleStyle,
    sess_max: invisibleStyle,

    task_count_range: showSubjectFilters
      ? {
          "ui:field": "countRangePair",
          "ui:options": {
            minKey: "task_min",
            maxKey: "task_max",
            label: "tasks",
          },
        }
      : hiddenStyle,
    task_min: invisibleStyle,
    task_max: invisibleStyle,

    run_count_range: showSubjectFilters
      ? {
          "ui:field": "countRangePair",
          "ui:options": {
            minKey: "run_min",
            maxKey: "run_max",
            label: "runs",
          },
        }
      : hiddenStyle,
    run_min: invisibleStyle,
    run_max: invisibleStyle,

    task_name: showSubjectFilters
      ? {
          "ui:placeholder": "e.g. rest, motor",
          ...(formData["task_name"] ? activeStyle : {}),
        }
      : hiddenStyle,
    type_name: showSubjectFilters
      ? {
          "ui:widget": "typeAutocomplete",
          "ui:options": {
            suggestions: getTypeSuggestions(formData.modality),
            ...(formData["type_name"]
              ? { style: { backgroundColor: Colors.lightBlue } }
              : {}),
          },
        }
      : hiddenStyle,
    session_name: showSubjectFilters
      ? {
          "ui:placeholder": "e.g. 01, pre, baseline",
          ...(formData["session_name"] ? activeStyle : {}),
        }
      : hiddenStyle,
    run_name: showSubjectFilters
      ? {
          "ui:placeholder": "e.g. 01, 02",
          ...(formData["run_name"] ? activeStyle : {}),
        }
      : hiddenStyle,

    "ui:submitButtonOptions": {
      props: {
        sx: {
          backgroundColor: Colors.purple,
          color: Colors.white,
          "&:hover": {
            backgroundColor: Colors.secondaryPurple,
            transform: "scale(1.05)",
          },
        },
      },
      submitText: "Submit",
      norender: true,
    },
  };
};
