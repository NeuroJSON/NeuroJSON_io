import { generateSchemaWithDatabaseEnum } from "../utils/SearchPageFunctions/searchformSchema";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import {
  Typography,
  Container,
  Box,
  Button,
  CircularProgress,
  Pagination,
  Chip,
  Drawer,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
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
import { generateUiSchema } from "utils/SearchPageFunctions/generateUiSchema";
import { modalityValueToEnumLabel } from "utils/SearchPageFunctions/modalityLabels";

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
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>({});
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // to show the applied chips on the top of results
  const activeFilters = Object.entries(appliedFilters).filter(
    ([key, value]) =>
      key !== "skip" &&
      key !== "limit" &&
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "any"
  );

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
        setAppliedFilters(parsed);
        const requestData = { ...parsed, skip: 0, limit: 50 };
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
  const uiSchema = useMemo(
    () => generateUiSchema(formData, showSubjectFilters),
    [formData, showSubjectFilters]
  );

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
    setAppliedFilters(requestData); // for chips on the top of results

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
    setQueryLink("");
    setAppliedFilters({});
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

  // handle chips click function
  const handleChipClick = (key: string, value: string) => {
    const updatedFormData: Record<string, any> = {
      ...formData,
      [key]:
        key === "modality" ? modalityValueToEnumLabel[value] || value : value,
      skip: 0,
    };
    setFormData(updatedFormData);
    setSkip(0);
    setPage(1);
    updateQueryLink(updatedFormData);
    dispatch(fetchMetadataSearchResults(updatedFormData)).then((res: any) => {
      setResults(res.payload);
    });
    setHasSearched(true);
    setAppliedFilters(updatedFormData); // for chips on top of results
  };

  // form rendering
  const renderFilterForm = () => (
    <>
      {queryLink && activeFilters.length > 0 && (
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
          type="submit"
          form="search-form"
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
        id="search-form"
        schema={schema}
        onSubmit={handleSubmit}
        validator={validator}
        formData={formData}
        onChange={({ formData }) => setFormData(formData)}
        uiSchema={uiSchema}
        fields={customFields}
      />
    </>
  );

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
      <Box // box for title and show filters button(mobile version)
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          borderBottom: `1px solid ${Colors.lightGray}`,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontSize: {
              xs: "1.5rem",
              sm: "2rem",
              md: "2.125rem",
            },
          }}
        >
          Metadata Search
        </Typography>
        {isMobile && !showMobileFilters && (
          <Button
            variant="text"
            onClick={() => setShowMobileFilters(true)}
            sx={{
              color: Colors.purple,
              "&:hover": {
                transform: "scale(1.05)",
                backgroundColor: "transparent",
                textDecoration: "underline",
              },
            }}
          >
            Show Filters
          </Button>
        )}
      </Box>

      <Box // form and results container
        sx={{
          display: "flex",
          gap: { xs: 0, sm: 1, md: 3 },
          alignItems: "flex-start",
        }}
      >
        {/* normal layout for form */}
        {!isMobile && (
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
            {renderFilterForm()}
          </Box>
        )}

        {/* before submit box */}
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

        {/* after submit box */}
        <Box
          sx={{
            flex: 2,
            width: { xs: "100%", sm: "auto" },
            backgroundColor: "white",
            px: { xs: 2, sm: 2, md: 3 },
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          {/* chips */}
          {activeFilters.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                mb: 2,
                mt: 1,
              }}
            >
              {activeFilters.map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${String(key)}: ${String(value)}`}
                  variant="outlined"
                  sx={{
                    color: Colors.darkPurple,
                    border: `1px solid ${Colors.darkPurple}`,
                    fontWeight: 500,
                    backgroundColor: "#f9f9ff",
                    "&:hover": {
                      backgroundColor: Colors.purple,
                      color: "white",
                      borderColor: Colors.purple,
                    },
                  }}
                  onDelete={() => {
                    const updated = { ...appliedFilters };
                    delete updated[key];

                    const remainingFilters = Object.entries(updated).filter(
                      ([k, v]) =>
                        k !== "skip" &&
                        k !== "limit" &&
                        v !== undefined &&
                        v !== null &&
                        v !== "" &&
                        v !== "any"
                    );

                    const hasActiveFilters = remainingFilters.length > 0;

                    setFormData(updated);
                    setAppliedFilters(updated);
                    setSkip(0);
                    setPage(1);
                    setHasSearched(hasActiveFilters); //only true if filters exist

                    updateQueryLink(updated);

                    if (hasActiveFilters) {
                      dispatch(
                        fetchMetadataSearchResults({ ...updated, skip: 0 })
                      ).then((res: any) => {
                        setResults(res.payload);
                      });
                    } else {
                      setResults([]);
                    }
                  }}
                />
              ))}
            </Box>
          )}

          {/* results */}
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
                          <Button
                            variant="outlined"
                            onClick={handleLoadMore}
                            sx={{
                              color: Colors.purple,
                              borderColor: Colors.purple,
                              "&:hover": {
                                transform: "scale(1.05)",
                                borderColor: Colors.purple,
                              },
                            }}
                          >
                            Load Extra 50 Results
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
                            onChipClick={handleChipClick}
                            keyword={formData.keyword} // for keyword highlight
                          />
                        ) : (
                          <SubjectCard
                            key={idx}
                            index={globalIndex}
                            {...item}
                            parsedJson={parsedJson}
                            onChipClick={handleChipClick}
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

        {/* mobile version filters */}
        <Drawer
          anchor="left"
          open={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          PaperProps={{
            sx: { width: "100%", p: 3 },
          }}
        >
          <Box
            textAlign="right"
            mb={2}
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "end",
            }}
          >
            <Typography variant="h4" sx={{ color: Colors.darkPurple }}>
              Metadata Filters
            </Typography>
            <Button
              variant="text"
              onClick={() => setShowMobileFilters(false)}
              sx={{
                color: Colors.purple,
                "&:hover": {
                  transform: "scale(1.05)",
                  backgroundColor: "transparent",
                  textDecoration: "underline",
                },
              }}
            >
              Back
            </Button>
          </Box>
          {renderFilterForm()}
        </Drawer>
      </Box>
    </Container>
  );
};

export default SearchPage;
