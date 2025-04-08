import { generateSchemaWithDatabaseEnum } from "./searchformSchema";
// schema
import { Typography, Container, Box } from "@mui/material";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React from "react";
import { useState, useEffect, useMemo } from "react";
// useEffect useMemo
import { Link } from "react-router-dom";
import {
  fetchMetadataSearchResults,
  fetchRegistry,
} from "redux/neurojson/neurojson.action";
import { RootState } from "redux/store";
import RoutesEnum from "types/routes.enum";

const SearchPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [hasSearched, setHasSearched] = useState(false);
  const searchResults = useAppSelector(
    (state: RootState) => state.neurojson.searchResults
  );
  const registry = useAppSelector(
    (state: RootState) => state.neurojson.registry
  );

  console.log("registry:", registry);
  console.log("result:", searchResults);

  useEffect(() => {
    dispatch(fetchRegistry());
  }, [dispatch]);

  // dynamic add database enum to schema
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
      //   maxWidth="md"
      style={{
        marginTop: "2rem",
        // backgroundColor: "rgba(97, 109, 243, 0.4)",
        // backdropFilter: "blur(10px)",
        backgroundColor: Colors.white,
        padding: "2rem",
        borderRadius: 4,
        width: "100%",
      }}
    >
      <Box
        sx={{
          //   backgroundColor: "white",
          //   p: 3,
          //   borderRadius: 2,
          //   boxShadow: 1,
          display: "flex",
          gap: 3,
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            // flex: "0 0 300px", // fixed width
            flex: 1,
            backgroundColor: "white",
            p: 3,
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <Form
            schema={schema}
            onSubmit={handleSubmit}
            validator={validator}
            liveValidate
          />
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
          {hasSearched && searchResults && (
            <Box mt={4}>
              {Array.isArray(searchResults) ? (
                searchResults.length > 0 ? (
                  <>
                    <Typography
                      variant="h6"
                      sx={{ borderBottom: "1px solid lightgray" }}
                    >
                      {`Found ${searchResults.length} Datasets`}
                    </Typography>
                    <ul>
                      {searchResults.map((item, idx) => {
                        const label = `${item.dbname}/${item.dsname}`;
                        const link = `${RoutesEnum.DATABASES}/${item.dbname}/${item.dsname}`;

                        return (
                          <Box key={idx} mb={1}>
                            <Link
                              to={link}
                              style={{
                                textDecoration: "none",
                                color: Colors.blue,
                              }}
                              target="_blank"
                            >
                              {label}
                            </Link>
                          </Box>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <Typography variant="h6">
                    No matching dataset was found
                  </Typography>
                )
              ) : (
                <Typography color="error">
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
