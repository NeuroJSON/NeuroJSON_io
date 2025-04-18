import { generateSchemaWithDatabaseEnum } from "./searchformSchema";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import {
  Typography,
  Container,
  Box,
  Button,
  CircularProgress,
  Pagination,
} from "@mui/material";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import DatasetCard from "components/SearchPage/DatasetCard";
import SubjectCard from "components/SearchPage/SubjectCard";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import pako from "pako";
import React from "react";
import { useState, useEffect, useMemo } from "react";
import {
  fetchMetadataSearchResults,
  fetchRegistry,
} from "redux/neurojson/neurojson.action";
import { RootState } from "redux/store";

const SearchPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [hasSearched, setHasSearched] = useState(false);
  const searchResults = useAppSelector(
    (state: RootState) => state.neurojson.searchResults
  );
  const registry = useAppSelector(
    (state: RootState) => state.neurojson.registry
  );
  const loading = useAppSelector((state: RootState) => state.neurojson.loading);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showSubjectFilters, setShowSubjectFilters] = useState(false);
  const [results, setResults] = useState<
    any[] | { status: string; msg: string }
  >([]);
  const [skip, setSkip] = useState(0);
  const [page, setPage] = useState(1);
  const [queryLink, setQueryLink] = useState("");

  // parse query from url on page load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#query=")) {
      const encoded = hash.replace("#query=", "");
      try {
        const decoded = pako.inflate(
          Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
          { to: "string" }
        );
        const parsed = JSON.parse(decoded);
        setFormData(parsed);
        const requestData = { ...parsed, skip: 0 };
        setSkip(0);
        setHasSearched(true);
        dispatch(fetchMetadataSearchResults(requestData)).then((res: any) => {
          if (res.payload) {
            setResults(res.payload);
          }
        });
      } catch (e) {
        console.error("Failed to parse query from URL", e);
      }
    }
  }, [dispatch]);

  // generate a direct link to the query
  const updateQueryLink = (queryData: Record<string, any>) => {
    const deflated = pako.deflate(JSON.stringify(queryData));
    const encoded = btoa(String.fromCharCode(...deflated));
    const link = `${window.location.origin}${window.location.pathname}#query=${encoded}`;
    setQueryLink(link);
  };

  // setting pagination
  const itemsPerPage = 10;

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const paginatedResults = Array.isArray(results)
    ? results.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    : [];

  // form UI
  const uiSchema = useMemo(() => {
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
        formData["database"] && formData["database"] !== "any"
          ? activeStyle
          : {},
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
  }, [formData, showSubjectFilters]);

  // Create the "Subject-level Filters" button as a custom field
  const customFields = {
    subjectFiltersToggle: () => (
      <Box sx={{ mt: 2, mb: 1 }}>
        <Button
          variant="outlined"
          onClick={() => setShowSubjectFilters((prev) => !prev)}
          sx={{
            color: Colors.purple,
            borderColor: Colors.purple,
            "&:hover": {
              transform: "scale(1.05)",
              borderColor: Colors.purple,
            },
          }}
        >
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

  // get the database list from registry
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

  // submit function
  const handleSubmit = ({ formData }: any) => {
    const requestData = { ...formData, skip: 0 };
    setFormData(requestData);
    setSkip(0);
    dispatch(fetchMetadataSearchResults(requestData)).then((res: any) => {
      setResults(res.payload);
    });
    setHasSearched(true);
    setPage(1);
    updateQueryLink(formData);
  };

  // reset function
  const handleReset = () => {
    setFormData({});
    setResults([]);
    setHasSearched(false);
    setSkip(0);
    dispatch(fetchMetadataSearchResults({}));
    setPage(1);
  };

  // load more function
  const handleLoadMore = () => {
    const newSkip = skip + 50;
    const requestData = { ...formData, skip: newSkip };
    setSkip(newSkip);
    dispatch(fetchMetadataSearchResults(requestData)).then((res: any) => {
      if (Array.isArray(res.payload)) {
        setResults((prev) =>
          Array.isArray(prev) ? [...prev, ...res.payload] : res.payload
        );
      }
    });
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
      <Typography variant="h4">Metadata Search</Typography>
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
          {queryLink && (
            <Box mt={2}>
              <a
                href={queryLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none", color: Colors.purple }}
              >
                <Box component="span" display="inline-flex" alignItems="center">
                  Direct Link to This Query
                  <ArrowCircleRightIcon sx={{ marginLeft: 0.5 }} />
                </Box>
              </a>
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-start",
              mt: 2,
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={() => document.querySelector("form")?.requestSubmit()}
              sx={{
                backgroundColor: Colors.purple,
                color: Colors.white,
                "&:hover": {
                  backgroundColor: Colors.secondaryPurple,
                  transform: "scale(1.05)",
                },
              }}
            >
              Submit
            </Button>
            <Button
              variant="outlined"
              onClick={handleReset}
              sx={{
                color: Colors.purple,
                borderColor: Colors.purple,
                "&:hover": {
                  transform: "scale(1.05)",
                  borderColor: Colors.purple,
                },
              }}
            >
              Reset
            </Button>
          </Box>
          <Form
            schema={schema}
            onSubmit={handleSubmit}
            validator={validator}
            // liveValidate
            formData={formData}
            onChange={({ formData }) => setFormData(formData)}
            uiSchema={uiSchema}
            fields={customFields}
          />
        </Box>
        <Box>
          {!hasSearched && (
            <Typography
              variant="subtitle1"
              sx={{
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
              {loading ? (
                <Box textAlign="center" my={4}>
                  <CircularProgress />
                  <Typography mt={2} color="text.secondary">
                    Loading search results...
                  </Typography>
                </Box>
              ) : Array.isArray(results) ? (
                <>
                  <Typography
                    variant="h6"
                    sx={{ borderBottom: "1px solid lightgray", mb: 2 }}
                  >
                    {results.length > 0
                      ? `Showing ${results.length} ${
                          isDataset ? "Datasets" : "Subjects"
                        }`
                      : `No matching ${
                          isDataset ? "datasets" : "subjects"
                        } found`}
                  </Typography>
                  {Array.isArray(results)
                    ? results.length >= 50 && (
                        <Box textAlign="center" mt={2}>
                          <Button variant="outlined" onClick={handleLoadMore}>
                            Load Extra 50
                          </Button>
                        </Box>
                      )
                    : null}

                  <Box textAlign="center" mt={2} mb={2}>
                    <Pagination
                      count={Math.ceil(results.length / itemsPerPage)}
                      page={page}
                      onChange={handlePageChange}
                      showFirstButton
                      showLastButton
                      siblingCount={2}
                      sx={{
                        "& .MuiPagination-ul": {
                          justifyContent: "center",
                        },
                        "& .MuiPaginationItem-root": {
                          color: Colors.darkPurple,
                        },
                        "& .MuiPaginationItem-root.Mui-selected": {
                          backgroundColor: Colors.purple,
                          color: "white",
                          fontWeight: "bold",
                          "&:hover": {
                            backgroundColor: Colors.secondaryPurple,
                          },
                        },
                      }}
                    />
                  </Box>

                  {results.length > 0 &&
                    paginatedResults.length > 0 &&
                    paginatedResults.map((item, idx) => {
                      try {
                        const parsedJson = JSON.parse(item.json);
                        const globalIndex = (page - 1) * itemsPerPage + idx;

                        const isDataset =
                          parsedJson?.value?.subj &&
                          Array.isArray(parsedJson.value.subj);

                        return isDataset ? (
                          <DatasetCard
                            key={idx}
                            index={globalIndex}
                            dbname={item.dbname}
                            dsname={item.dsname}
                            parsedJson={parsedJson}
                          />
                        ) : (
                          <SubjectCard
                            key={idx}
                            index={globalIndex}
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
                  {results?.msg === "empty output"
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
