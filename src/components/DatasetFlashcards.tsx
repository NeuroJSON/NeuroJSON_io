import React from "react";
import { Box, Typography } from "@mui/material";

interface DatasetFlashcardsProps {
  pagename: string;
  docname: string;
  dbname: string;
  serverUrl: string;
  datasetDocument?: any;
  onekey: string;
}

const flashcardStyles = {
  container: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: "20px",
    gap: "0px",
  },
  flashcard: {
    background: "white",
    padding: "15px",
    marginBottom: "0px",
    borderRadius: "8px",
    borderLeft: "5px solid #6200ea",
    width: "calc(50% - 8px)", // Two per row, tight spacing
    boxSizing: "border-box" as const,
  },
  flashcardTitle: {
    marginTop: 0,
    fontWeight: "bold",
  },
  codeBlock: {
    display: "block",
    background: "#e0e0e0",
    padding: "10px",
    borderRadius: "5px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
  },
};

const DatasetFlashcards: React.FC<DatasetFlashcardsProps> = ({
  pagename,
  docname,
  dbname,
  serverUrl,
  datasetDocument,
  onekey,
}) => {
  const datasetDesc = datasetDocument?.["dataset_description.json"];
  const datasetName = datasetDesc?.Name?.includes(" - ")
    ? datasetDesc.Name.split(" - ")[1]
    : datasetDesc?.Name || datasetDocument?._id || docname;

  const datasetUrl = datasetName
    ? `${serverUrl}${dbname}/${encodeURIComponent(datasetName)}/`
    : `${serverUrl}${dbname}/`;

  return (
    <Box sx={flashcardStyles.container}>
      {/* FLASHCARD 1: Python REST API */}
      <Box style={flashcardStyles.flashcard}>
        <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
          Load by URL with REST-API in Python
        </Typography>
        <Typography>Install:</Typography>
        <code style={flashcardStyles.codeBlock}>pip install jdata bjdata numpy</code>
        <Typography>Load from URL:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`import jdata as jd
data = jd.loadurl('${datasetUrl}')  

# List all externally linked files
links = jd.jsonpath(data, '$.._DataLink_')

# Download & cache anatomical nii.gz data for sub-01/sub-02
jd.jdlink(links, {'regex': 'anat/sub-0[12]_.*\\.nii'})`}
        </code>
      </Box>

      {/* FLASHCARD 2: MATLAB REST API */}
      <Box style={flashcardStyles.flashcard}>
        <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
          Load by URL with REST-API in MATLAB
        </Typography>
        <Typography>Install:</Typography>
        <code style={flashcardStyles.codeBlock}>Download and addpath to JSONLab</code>
        <Typography>Load from URL:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`data = loadjson('${datasetUrl}');

% or without JSONLab (webread cannot decode JData annotations)
data = webread('${datasetUrl}');

% List all externally linked files
links = jsonpath(data, '$.._DataLink_');

% Download & cache anatomical nii.gz data for sub-01/sub-02
niidata = jdlink(links, 'regex', 'anat/sub-0[12]_.*\\.nii');`}
        </code>
      </Box>

      {/* FLASHCARD 3: MATLAB/Octave */}
      <Box style={flashcardStyles.flashcard}>
        <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
          Use in MATLAB/Octave
        </Typography>
        <Typography>Load:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`data = loadjd('${docname}.json');`}
        </code>
        <Typography>Read value:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`data.(encodevarname('${onekey}'))`}
        </code>
      </Box>

      {/* FLASHCARD 4: Python Local */}
      <Box style={flashcardStyles.flashcard}>
        <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
          Use in Python
        </Typography>
        <Typography>Load:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`import jdata as jd
data = jd.load('${docname}.json')`}
        </code>
        <Typography>Read value:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`data["${onekey}"]`}
        </code>
      </Box>

      {/* FLASHCARD 5: C++ */}
      <Box style={flashcardStyles.flashcard}>
        <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
          Use in C++
        </Typography>
        <Typography>Install:</Typography>
        <code style={flashcardStyles.codeBlock}>
          Download JSON for Modern C++ json.hpp
        </code>
        <Typography>Load:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`#include "json.hpp"
using json=nlohmann::ordered_json;

std::ifstream datafile("${docname}.json");
json data(datafile);`}
        </code>
        <Typography>Read value:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`std::cout << data["${onekey}"];`}
        </code>
      </Box>

      {/* FLASHCARD 6: Node.js */}
      <Box style={flashcardStyles.flashcard}>
        <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
          Use in JS/Node.js
        </Typography>
        <Typography>Install:</Typography>
        <code style={flashcardStyles.codeBlock}>npm install jda numjs pako atob</code>
        <Typography>Load:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`const fs = require("fs");
const jd = require("jda");
global.atob = require("atob");

const fn = "${docname}.json";
var jstr = fs.readFileSync(fn).toString().replace(/\\n/g, "");
var data = new jd(JSON.parse(jstr));
data = data.decode();`}
        </code>
        <Typography>Read value:</Typography>
        <code style={flashcardStyles.codeBlock}>
          {`console.log(data.data["${onekey}"]);`}
        </code>
      </Box>
    </Box>
  );
};

export default DatasetFlashcards;
