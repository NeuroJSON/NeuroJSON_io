import { generateSchemaWithDatabaseEnum } from "../utils/SearchPageFunctions/searchformSchema";
import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Typography,
  Container,
  Box,
  Button,
  CircularProgress,
  Pagination,
  Chip,
  Drawer,
  Tooltip,
  IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import ClickTooltip from "components/SearchPage/ClickTooltip";
import DatabaseCard from "components/SearchPage/DatabaseCard";
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

type RegistryItem = {
  id: string;
  name?: string;
  fullname?: string;
  datatype?: string[];
  datasets?: number;
  logo?: string;
};

const matchesKeyword = (item: RegistryItem, keyword: string) => {
  if (!keyword) return false;
  const needle = keyword.toLowerCase();
  return (
    item.name?.toLowerCase().includes(needle) ||
    item.fullname?.toLowerCase().includes(needle) ||
    item.datatype?.some((dt) => dt.toLowerCase().includes(needle))
  );
};

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
  const upMd = useMediaQuery(theme.breakpoints.up("md"));

  const placement = upMd ? "right" : "top";

  // for database card
  const keywordInput = String(formData?.keyword ?? "").trim();
  const selectedDbId = String(formData?.database ?? "").trim();

  const registryMatches: RegistryItem[] = React.useMemo(() => {
    if (!Array.isArray(registry)) return [];
    const list = registry as RegistryItem[];

    const fromId =
      selectedDbId && selectedDbId !== "any"
        ? list.filter((r) => r.id === selectedDbId)
        : [];

    const fromKeyword = keywordInput
      ? list.filter((r) => matchesKeyword(r, keywordInput))
      : [];

    // merge the db results of selectedDB and keywordInput --> de duplicates
    const map = new Map<string, RegistryItem>();
    [...fromId, ...fromKeyword].forEach((r) => map.set(r.id, r));
    return Array.from(map.values()); // return matched registry
  }, [registry, selectedDbId, keywordInput]);

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
          flexDirection: { sm: "column", md: "row" },
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
          Search
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

  // check if has database/dataset matches
  // const hasDbMatches = !!keywordInput && registryMatches.length > 0;
  const hasDbMatches = registryMatches.length > 0;
  const hasDatasetMatches = Array.isArray(results) && results.length > 0;
  // when backend find nothing
  const backendEmpty =
    !Array.isArray(results) && (results as any)?.msg === "empty output";

  // show red message only if nothing matched at all
  const showNoResults =
    hasSearched &&
    !loading &&
    !hasDbMatches &&
    (!hasDatasetMatches || backendEmpty);
  return (
    <Container
      maxWidth={false}
      style={{
        marginTop: "2rem",
        marginBottom: "2rem",
        backgroundColor: Colors.white,
        padding: "2rem",
        borderRadius: 4,
        width: "95%",
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
          Search
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
              minWidth: "25%",
            }}
          >
            {renderFilterForm()}
          </Box>
        )}

        {/* before submit box */}
        {/* <Box>
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
              Use the filters and click submit to search for datasets or
              subjects based on metadata.
            </Typography>
          )}
        </Box> */}

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

          {/* {!hasSearched && (
            <Typography
              variant="subtitle1"
              sx={{
                flexWrap: "wrap",
                fontWeight: 500,
                fontSize: "large",
                color: Colors.darkPurple,
                mb: 2,
                pt: 1,
              }}
            >
              Use the filters and click submit to search for{" "}
              <Box component="span" sx={{ color: Colors.darkOrange, fontWeight: 700 }}>
                datasets
              </Box>{" "}
              and{" "}
              <Box
                component="span"
                sx={{ color: Colors.darkOrange, fontWeight: 700 }}
              >
                subjects
              </Box>{" "}
              based on metadata.
            </Typography>
          )} */}

          <Box
            sx={{
              // display: "grid",
              // gridTemplateColumns: {
              //   xs: "1fr",
              //   md: hasDbMatches ? "1fr 2fr" : "1fr",
              // },
              // gap: 2,
              // alignItems: "baseline",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* suggested databases */}
            {registryMatches.length > 0 && (
              <Box
                sx={{
                  mb: 3,
                  pr: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    mb: 1.5,
                    mt: 1.5,
                    borderBottom: "1px solid lightgray",
                  }}
                >
                  <Typography variant="h6">Suggested databases</Typography>

                  <ClickTooltip
                    placement={placement}
                    componentsProps={{
                      tooltip: {
                        sx: {
                          bgcolor: "#fff",
                          color: Colors.darkPurple,
                          border: `1px solid ${Colors.lightGray}`,
                          boxShadow: 3,
                          maxWidth: { sm: 200, md: 400 },
                          p: 1.5,
                          fontSize: "0.875rem",
                          lineHeight: 1.5,
                        },
                      },
                      arrow: {
                        sx: {
                          color: "#fff", // make arrow match tooltip bg
                          "&::before": {
                            border: `1px solid ${Colors.lightGray}`, // subtle arrow border
                          },
                        },
                      },
                    }}
                    title={
                      <Typography variant="body2">
                        Live preview based on your keyword or selected database.
                        This list updates as you type or change the dropdown.
                        It’s <strong>separate from the results</strong>—you’ll
                        see datasets/subjects after you click <em>Search</em>.
                      </Typography>
                    }
                  >
                    <IconButton
                      size="small"
                      aria-label="Live preview info"
                      sx={{ p: 0.25, color: Colors.purple }}
                    >
                      <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </ClickTooltip>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  {registryMatches.map((db) => (
                    <DatabaseCard
                      key={db.id}
                      dbId={db.id}
                      fullName={db.fullname ?? db.name}
                      datasets={db.datasets}
                      modalities={db.datatype}
                      logo={db.logo}
                      keyword={formData.keyword} // for keyword highlight
                      onChipClick={handleChipClick}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* results */}
            {!hasSearched && (
              <Box sx={{ position: "relative", minHeight: 300 }}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 1.5,
                    mt: 1.5,
                    borderBottom: "1px solid lightgray",
                  }}
                >
                  Search Results
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{
                    position: "relative",
                    flexWrap: "wrap",
                    fontWeight: 500,
                    fontSize: "large",
                    color: Colors.darkPurple,
                    mb: 2,
                    pt: 1,
                  }}
                >
                  Use the filters and click search to get results for{" "}
                  <Box
                    component="span"
                    sx={{ color: Colors.darkOrange, fontWeight: 700 }}
                  >
                    datasets
                  </Box>{" "}
                  and{" "}
                  <Box
                    component="span"
                    sx={{ color: Colors.darkOrange, fontWeight: 700 }}
                  >
                    subjects
                  </Box>{" "}
                  based on metadata.
                </Typography>
                <Box
                  component="img"
                  src={`${process.env.PUBLIC_URL}/img//search_page/search.png`}
                  alt="Search illustration"
                  sx={{
                    position: "absolute",
                    top: "75%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: { xs: 150, md: 150 },
                    pointerEvents: "none",
                    userSelect: "none",
                    mb: 4,
                    pb: 2,
                  }}
                />
              </Box>
            )}
            {hasSearched && (
              <Box
                mt={4}
                sx={{
                  borderLeft: `1px solid ${Colors.lightGray}`,
                  pl: 4,
                  mb: 2,
                }}
              >
                {loading ? (
                  <Box textAlign="center" my={4}>
                    <CircularProgress />
                    <Typography mt={2} color="text.secondary">
                      Loading search results...
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Only show header when there are dataset hits */}
                    {hasDatasetMatches && (
                      <Typography
                        variant="h6"
                        sx={{ borderBottom: "1px solid lightgray", mb: 2 }}
                      >
                        {`Showing ${results.length} ${
                          isDataset ? "Datasets" : "Subjects"
                        }`}
                      </Typography>
                    )}

                    {/* pagination + cards (unchanged, but guard with hasDatasetMatches) */}
                    {hasDatasetMatches && (
                      <>
                        {results.length >= 50 && (
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
                        )}

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
                              const globalIndex =
                                (page - 1) * itemsPerPage + idx;

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
                    )}

                    {/* Single place to show the red message */}
                    {showNoResults && (
                      <Typography sx={{ color: Colors.error }}>
                        No results found based on your criteria. Please adjust
                        the filters and try again.
                      </Typography>
                    )}

                    {hasSearched &&
                      !loading &&
                      !Array.isArray(results) &&
                      results?.msg !== "empty output" && (
                        <Typography sx={{ color: Colors.error }}>
                          Something went wrong. Please try again later.
                        </Typography>
                      )}
                  </>
                )}
              </Box>
            )}
          </Box>
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
