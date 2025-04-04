import { schema } from "./searchformSchema";
import { Typography, Container, Box } from "@mui/material";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

// helper function to build query string
const buildQueryString = (formData: any): string => {
  const map: Record<string, string> = {
    keyword: "keyword",
    age_min: "agemin",
    age_max: "agemax",
    task_min: "taskmin",
    task_max: "taskmax",
    run_min: "runmin",
    run_max: "runmax",
    sess_min: "sessmin",
    sess_max: "sessmax",
    modality: "modality",
    run_name: "run",
    type_name: "type",
    session_name: "session",
    task_name: "task",
    limit: "limit",
    skip: "skip",
    count: "count",
    unique: "unique",
    gender: "gender",
    database: "dbname",
    dataset: "dsname",
    subject: "subname",
  };

  const params = new URLSearchParams();
  Object.keys(formData).forEach((key) => {
    let val = formData[key];
    if (val === "" || val === "any" || val === undefined || val === null)
      return;

    const queryKey = map[key];
    if (!queryKey) return;

    if (key.startsWith("age")) {
      params.append(queryKey, String(Math.floor(val * 100)).padStart(5, "0"));
    } else if (key === "gender") {
      params.append(queryKey, val[0]);
    } else if (key === "modality") {
      params.append(queryKey, val.replace(/.*\(/, "").replace(/\).*/, ""));
    } else {
      params.append(queryKey, val.toString());
    }
  });

  return `?${params.toString()}`;
};

const SearchPage: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  //   const handleSubmit = ({ formData }: any) => {
  //     console.log("submitted search query:", formData);
  //   };
  const handleSubmit = async ({ formData }: any) => {
    console.log("submitted search query:", formData);
    const query = buildQueryString(formData);
    const url = `https://cors.redoc.ly/https://neurojson.org/io/search.cgi${query}`;
    // console.log("url", url);
    try {
      const res = await fetch(url);
      const data = await res.json();
      setResult(data);
      console.log(data);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
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

        {/* {result && (
          <Box mt={4}>
            <Typography variant="h6">Datasets Found</Typography>
            <pre style={{ background: "#f5f5f5", padding: "1rem" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </Box>
        )} */}
        {hasSearched && (
          <Box mt={4}>
            {Array.isArray(result) ? (
              result.length > 0 ? (
                <>
                  <Typography variant="h6">
                    {`Found ${result.length} Datasets`}
                  </Typography>
                  <ul>
                    {result.map((item, idx) => {
                      const label = `${item.dbname}/${item.dsname}`;
                      const link = `${RoutesEnum.DATABASES}/${item.dbname}/${item.dsname}`;

                      return (
                        <Box key={idx} mb={1}>
                          <Link
                            to={link}
                            style={{ textDecoration: "none", color: "#1976d2" }}
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
                {result?.msg === "empty output"
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
