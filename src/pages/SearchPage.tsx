import { generateSchemaWithDatabaseEnum } from "./searchformSchema";
import { Typography, Container, Box } from "@mui/material";
import { Collapse, Button } from "@mui/material";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import DatasetCard from "components/SearchPage/DatasetCard";
import SubjectCard from "components/SearchPage/SubjectCard";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  fetchMetadataSearchResults,
  fetchRegistry,
} from "redux/neurojson/neurojson.action";
import { RootState } from "redux/store";

//

const SearchPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [hasSearched, setHasSearched] = useState(false);
  const searchResults = useAppSelector(
    (state: RootState) => state.neurojson.searchResults
  );
  const registry = useAppSelector(
    (state: RootState) => state.neurojson.registry
  );

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showSubjectFilters, setShowSubjectFilters] = useState(false); //

  const uiSchema = useMemo(() => {
    const activeStyle = {
      "ui:options": {
        style: {
          backgroundColor: Colors.lightBlue,
        },
      },
    };
    // hide subject-level filter
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
        formData["database"] && formData["database"] !== "any"
          ? activeStyle
          : {},
      dataset: formData["dataset"] ? activeStyle : {},

      //   age_min: formData["age_min"] ? activeStyle : {},
      //   age_max: formData["age_max"] ? activeStyle : {},

      //   gender:
      //     formData["gender"] && formData["gender"] !== "any" ? activeStyle : {},

      //   sess_min: formData["sess_min"] ? activeStyle : {},
      //   sess_max: formData["sess_max"] ? activeStyle : {},

      //   task_min: formData["task_min"] ? activeStyle : {},
      //   task_max: formData["task_max"] ? activeStyle : {},

      //   run_min: formData["run_min"] ? activeStyle : {},
      //   run_max: formData["run_max"] ? activeStyle : {},

      //   task_name: formData["task_name"] ? activeStyle : {},
      //   session_name: formData["session_name"] ? activeStyle : {},
      //   run_name: formData["run_name"] ? activeStyle : {},
      //   type_name: formData["type_name"] ? activeStyle : {},

      //   modality:
      //     formData["modality"] && formData["modality"] !== "any"
      //       ? activeStyle
      //       : {},

      limit: formData["limit"] ? activeStyle : {},
      skip: formData["skip"] ? activeStyle : {},

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
    };
  }, [formData, showSubjectFilters]);

  // Create the toggle button as a custom field
  const customFields = {
    subjectFiltersToggle: () => (
      <Box sx={{ mt: 2, mb: 1 }}>
        <Button
          variant="outlined"
          onClick={() => setShowSubjectFilters((prev) => !prev)}
        >
          {/* {showSubjectFilters
            ? "Hide Subject-Level Filters"
            : "Show Subject-Level Filters"} */}
          Subject-Level Filters
        </Button>
      </Box>
    ),
  };

  // print the result in dev tool
  if (Array.isArray(searchResults)) {
    searchResults.forEach((item, idx) => {
      try {
        const parsed = JSON.parse(item.json);
        console.log(`Result #${idx}:`, { ...item, parsedJson: parsed });
      } catch (e) {
        console.error(`Failed to parse JSON for item #${idx}`, e);
      }
    });
  } else {
    console.warn("searchResults is not an array:", searchResults);
  }

  // determine the results are subject-level or dataset-level
  let isDataset: boolean | null = null;

  if (Array.isArray(searchResults) && searchResults.length > 0) {
    try {
      const parsed = JSON.parse(searchResults[0].json);
      isDataset = parsed?.value?.subj && Array.isArray(parsed.value.subj);
    } catch {
      isDataset = null;
    }
  }

  useEffect(() => {
    dispatch(fetchRegistry());
  }, [dispatch]);

  // dynamically add database enum to schema
  const schema = useMemo(() => {
    const dbList = registry?.length
      ? [...registry.map((item: any) => item.id), "any"]
      : ["any"];
    return generateSchemaWithDatabaseEnum(dbList);
  }, [registry]);

  const handleSubmit = ({ formData }: any) => {
    dispatch(fetchMetadataSearchResults(formData));
    setHasSearched(true);
  };

  return (
    <Container
      style={{
        marginTop: "2rem",
        marginBottom: "2rem",
        backgroundColor: Colors.white,
        padding: "2rem",
        borderRadius: 4,
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 3,
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            flex: 1,
            backgroundColor: "white",
            p: 3,
            borderRadius: 2,
            boxShadow: 1,
            minWidth: "35%",
          }}
        >
          <Form
            schema={schema}
            onSubmit={handleSubmit}
            validator={validator}
            // liveValidate
            formData={formData}
            onChange={({ formData }) => setFormData(formData)}
            uiSchema={uiSchema}
            fields={customFields} //
          />
        </Box>
        <Box>
          {!hasSearched && (
            <Typography
              variant="subtitle1"
              sx={{
                // whiteSpace: "nowrap",
                flexWrap: "wrap",
                fontWeight: 500,
                fontSize: "large",
                color: Colors.darkPurple,
              }}
            >
              Use the filters to search for datasets or subjects based on
              metadata.
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            flex: 2,
            backgroundColor: "white",
            paddingLeft: 3,
            paddingRight: 3,
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          {hasSearched && (
            <Box mt={4}>
              {Array.isArray(searchResults) ? (
                <>
                  <Typography
                    variant="h6"
                    sx={{ borderBottom: "1px solid lightgray", mb: 2 }}
                  >
                    {searchResults.length > 0
                      ? `Found ${searchResults.length} ${
                          isDataset ? "Datasets" : "Subjects"
                        }`
                      : `No matching ${
                          isDataset ? "datasets" : "subjects"
                        } found`}
                  </Typography>

                  {searchResults.length > 0 &&
                    searchResults.map((item, idx) => {
                      try {
                        const parsedJson = JSON.parse(item.json);
                        const isDataset =
                          parsedJson?.value?.subj &&
                          Array.isArray(parsedJson.value.subj);

                        return isDataset ? (
                          <DatasetCard
                            key={idx}
                            dbname={item.dbname}
                            dsname={item.dsname}
                            parsedJson={parsedJson}
                          />
                        ) : (
                          <SubjectCard
                            key={idx}
                            {...item}
                            parsedJson={parsedJson}
                          />
                        );
                      } catch (e) {
                        console.error(
                          `Failed to parse JSON for item #${idx}`,
                          e
                        );
                        return null;
                      }
                    })}
                </>
              ) : (
                <Typography sx={{ color: Colors.error }}>
                  {searchResults?.msg === "empty output"
                    ? "No results found based on your criteria. Please adjust the filters and try again."
                    : "Something went wrong. Please try again later."}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default SearchPage;
