import { Colors } from "design/theme";

// Controls the background highlight of selected fields
// Controls the visibility of subject-level filters
export const generateUiSchema = (
  formData: Record<string, any>,
  showSubjectFilters: boolean
) => {
  const activeStyle = {
    "ui:options": {
      style: {
        backgroundColor: Colors.lightBlue,
      },
    },
  };

  // hide subject-level filter
  const invisibleStyle = {
    "ui:options": {
      style: {
        display: "none",
      },
    },
  };

  const hiddenStyle = {
    "ui:options": {
      style: {
        display: showSubjectFilters ? "block" : "none",
      },
    },
  };

  return {
    keyword: formData["keyword"] ? activeStyle : {},
    database:
      formData["database"] && formData["database"] !== "any" ? activeStyle : {},
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

    age_min: showSubjectFilters
      ? formData["age_min"]
        ? activeStyle
        : {}
      : hiddenStyle,
    age_max: showSubjectFilters
      ? formData["age_max"]
        ? activeStyle
        : {}
      : hiddenStyle,

    gender: showSubjectFilters
      ? formData["gender"] && formData["gender"] !== "any"
        ? activeStyle
        : {}
      : hiddenStyle,

    sess_min: showSubjectFilters
      ? formData["sess_min"]
        ? activeStyle
        : {}
      : hiddenStyle,
    sess_max: showSubjectFilters
      ? formData["sess_max"]
        ? activeStyle
        : {}
      : hiddenStyle,

    task_min: showSubjectFilters
      ? formData["task_min"]
        ? activeStyle
        : {}
      : hiddenStyle,
    task_max: showSubjectFilters
      ? formData["task_max"]
        ? activeStyle
        : {}
      : hiddenStyle,

    run_min: showSubjectFilters
      ? formData["run_min"]
        ? activeStyle
        : {}
      : hiddenStyle,
    run_max: showSubjectFilters
      ? formData["run_max"]
        ? activeStyle
        : {}
      : hiddenStyle,

    task_name: showSubjectFilters
      ? formData["task_name"]
        ? activeStyle
        : {}
      : hiddenStyle,
    type_name: showSubjectFilters
      ? formData["type_name"]
        ? activeStyle
        : {}
      : hiddenStyle,
    session_name: showSubjectFilters
      ? formData["session_name"]
        ? activeStyle
        : {}
      : hiddenStyle,
    run_name: showSubjectFilters
      ? formData["run_name"]
        ? activeStyle
        : {}
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
