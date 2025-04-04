import { schema } from "./searchformSchema";
import { Typography, Container, Box } from "@mui/material";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchMetadataSearchResults } from "redux/neurojson/neurojson.action";
import { RootState } from "redux/store";
import RoutesEnum from "types/routes.enum";

const SearchPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const [hasSearched, setHasSearched] = useState(false);
  const searchResults = useAppSelector(
    (state: RootState) => state.neurojson.searchResults
  );

  const handleSubmit = ({ formData }: any) => {
    dispatch(fetchMetadataSearchResults(formData));
    setHasSearched(true);
  };

  return (
    <Container maxWidth="md" style={{ marginTop: "2rem" }}>
      <Box
        sx={{
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

        {hasSearched && searchResults && (
          <Box mt={4}>
            {Array.isArray(searchResults) ? (
              searchResults.length > 0 ? (
                <>
                  <Typography variant="h6">
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
    </Container>
  );
};

export default SearchPage;
