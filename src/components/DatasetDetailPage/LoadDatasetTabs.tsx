import { Tabs, Tab, Box, Typography } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { useState } from "react";

interface LoadDatasetTabsProps {
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
    borderLeft: `5px solid ${Colors.green}`,
    // width: "calc(100% - 8px)", // Two per row, tight spacing
    width: "100%",
    boxSizing: "border-box" as const,
  },
  flashcardTitle: {
    marginTop: 0,
    marginBottom: 8,
    fontWeight: "bold",
    color: Colors.darkPurple,
  },
  codeBlock: {
    display: "block",
    background: "#e0e0e0",
    // background: Colors.black,
    color: Colors.black,
    padding: "10px",
    borderRadius: "5px",
    // fontFamily: "monospace",
    whiteSpace: "pre-wrap",
  },
};

const LoadDatasetTabs: React.FC<LoadDatasetTabsProps> = ({
  pagename,
  docname,
  dbname,
  serverUrl,
  datasetDocument,
  onekey,
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };
  const datasetDesc = datasetDocument?.["dataset_description.json"];
  const datasetName = datasetDesc?.Name?.includes(" - ")
    ? datasetDesc.Name.split(" - ")[1]
    : datasetDesc?.Name || datasetDocument?._id || docname;
  const datasetUrl = datasetName
    ? `${serverUrl}${dbname}/${encodeURIComponent(datasetName)}/`
    : `${serverUrl}${dbname}/`;

  const TabPanel = ({
    children,
    value,
    index,
  }: {
    children?: React.ReactNode;
    value: number;
    index: number;
  }) => {
    return (
      <div role="tabpanel" hidden={value !== index}>
        {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
        {/* {value === index && (
          <Box
            sx={{
              border: "1px solid #ccc",
              borderTop: "none",
              borderRadius: "5px 5px 5px 5px",
              p: 2,
              backgroundColor: "#fff",
              borderLeft: `5px solid ${Colors.purple}`,
            }}
          >
            {children}
          </Box>
        )} */}
      </div>
    );
  };

  return (
    <>
      <Tabs
        value={tabIndex}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          "& .MuiTab-root": {
            color: Colors.lightGray, // default color
            fontSize: "large",
          },
          "& .Mui-selected": {
            color: Colors.green, // active tab color
            fontWeight: "bold",
            // backgroundColor: Colors.white,
            // borderRadius: "5px 5px 0px 0px",
            // borderLeft: `5px solid ${Colors.purple}`,
          },
          "& .MuiTabs-indicator": {
            backgroundColor: Colors.green, // underline color
            // display: "none",
          },
        }}
      >
        <Tab label="Python (REST API)" />
        <Tab label="MATLAB (REST API)" />
        <Tab label="MATLAB/Octave (Local)" />
        <Tab label="Python (Local)" />
        <Tab label="C++" />
        <Tab label="Node.js" />
      </Tabs>

      {/* FLASHCARD 1: Python REST API */}
      <TabPanel value={tabIndex} index={0}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Load by URL with REST-API in Python
          </Typography>
          <Typography>Install:</Typography>
          <code style={flashcardStyles.codeBlock}>
            pip install jdata bjdata numpy
          </code>
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
      </TabPanel>

      {/* FLASHCARD 2: MATLAB REST API */}
      <TabPanel value={tabIndex} index={1}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Load by URL with REST-API in MATLAB
          </Typography>
          <Typography>Install:</Typography>
          <code style={flashcardStyles.codeBlock}>
            Download and addpath to JSONLab
          </code>
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
      </TabPanel>

      {/* FLASHCARD 3: MATLAB/Octave */}
      <TabPanel value={tabIndex} index={2}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Use in MATLAB/Octave
          </Typography>
          <Typography>Load:</Typography>
          <code
            style={flashcardStyles.codeBlock}
          >{`data = loadjd('${docname}.json');`}</code>
          <Typography>Read value:</Typography>
          <code
            style={flashcardStyles.codeBlock}
          >{`data.(encodevarname('${onekey}'))`}</code>
        </Box>
      </TabPanel>

      {/* FLASHCARD 4: Python Local */}
      <TabPanel value={tabIndex} index={3}>
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
          <code style={flashcardStyles.codeBlock}>{`data["${onekey}"]`}</code>
        </Box>
      </TabPanel>

      {/* FLASHCARD 5: C++ */}
      <TabPanel value={tabIndex} index={4}>
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
          <code
            style={flashcardStyles.codeBlock}
          >{`std::cout << data["${onekey}"];`}</code>
        </Box>
      </TabPanel>

      {/* FLASHCARD 6: Node.js */}
      <TabPanel value={tabIndex} index={5}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Use in JS/Node.js
          </Typography>
          <Typography>Install:</Typography>
          <code style={flashcardStyles.codeBlock}>
            npm install jda numjs pako atob
          </code>
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
          <code
            style={flashcardStyles.codeBlock}
          >{`console.log(data.data["${onekey}"]);`}</code>
        </Box>
      </TabPanel>
    </>
  );
};

export default LoadDatasetTabs;
