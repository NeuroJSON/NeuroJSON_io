import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Tabs, Tab, Box, Typography, IconButton, Tooltip } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { useState } from "react";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import bash from "react-syntax-highlighter/dist/esm/languages/hljs/bash";
import cpp from "react-syntax-highlighter/dist/esm/languages/hljs/cpp";
import javascript from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import matlab from "react-syntax-highlighter/dist/esm/languages/hljs/matlab";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";
import {
  docco,
  atomOneDark,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Color } from "three";

// Register them
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("matlab", matlab);
SyntaxHighlighter.registerLanguage("javascript", javascript);
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
    color: Colors.black,
    padding: "10px",
    borderRadius: "5px",
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
  // console.log("datasetDocument", datasetDocument);
  const datasetDesc = datasetDocument?.["dataset_description.json"];
  // console.log("datasetDesc", datasetDesc);
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
      </div>
    );
  };

  // const CopyableCodeBlock = ({ code }: { code: string }) => {
  //   const handleCopy = () => {
  //     navigator.clipboard.writeText(code);
  //   };
  //   return (
  //     <Box sx={{ position: "relative" }}>
  //       <IconButton
  //         onClick={handleCopy}
  //         size="small"
  //         sx={{ position: "absolute", top: 5, right: 5 }}
  //       >
  //         <Tooltip title="Copy to clipboard">
  //           <ContentCopyIcon fontSize="small" />
  //         </Tooltip>
  //       </IconButton>
  //       <code style={flashcardStyles.codeBlock}>{code}</code>
  //     </Box>
  //   );
  // };
  const CopyableCodeBlock = ({
    code,
    language = "python", // optionally allow language selection
  }: {
    code: string;
    language?: string;
  }) => {
    const handleCopy = () => {
      navigator.clipboard.writeText(code);
    };

    return (
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={handleCopy}
          size="small"
          sx={{ position: "absolute", top: 5, right: 5 }}
        >
          <Tooltip title="Copy to clipboard">
            <ContentCopyIcon fontSize="small" sx={{ color: Colors.green }} />
          </Tooltip>
        </IconButton>
        <SyntaxHighlighter
          language={language}
          style={atomOneDark}
          customStyle={{
            padding: "12px",
            borderRadius: "5px",
            fontSize: "14px",
            background: Colors.black,
            overflowX: "auto",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </Box>
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
            textTransform: "none",
          },
          "& .MuiTab-root.Mui-selected": {
            color: Colors.green, // active tab color
            fontWeight: "bold",
          },
          "& .MuiTabs-indicator": {
            backgroundColor: Colors.green,
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
          <CopyableCodeBlock
            code={`pip install jdata bjdata numpy`}
            language="bash"
          />
          <Typography>Load from URL:</Typography>
          <CopyableCodeBlock
            code={`import jdata as jd
data = jd.loadurl('${datasetUrl}')  

# List all externally linked files
links = jd.jsonpath(data, '$.._DataLink_')

# Download & cache anatomical nii.gz data for sub-01/sub-02
jd.jdlink(links, {'regex': 'anat/sub-0[12]_.*\\.nii'})`}
            language="python"
          />
        </Box>
      </TabPanel>

      {/* FLASHCARD 2: MATLAB REST API */}
      <TabPanel value={tabIndex} index={1}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Load by URL with REST-API in MATLAB
          </Typography>
          <Typography>Install:</Typography>
          <CopyableCodeBlock
            code={`Download and addpath to JSONLab`}
            language="text"
          />
          <Typography>Load from URL:</Typography>
          <CopyableCodeBlock
            code={`data = loadjson('${datasetUrl}');

% or without JSONLab (webread cannot decode JData annotations)
data = webread('${datasetUrl}');

% List all externally linked files
links = jsonpath(data, '$.._DataLink_');

% Download & cache anatomical nii.gz data for sub-01/sub-02
niidata = jdlink(links, 'regex', 'anat/sub-0[12]_.*\\.nii');`}
            language="matlab"
          />
        </Box>
      </TabPanel>

      {/* FLASHCARD 3: MATLAB/Octave */}
      <TabPanel value={tabIndex} index={2}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Use in MATLAB/Octave
          </Typography>
          <Typography>Load:</Typography>
          <CopyableCodeBlock
            code={`data = loadjd('${docname}.json');`}
            language="matlab"
          />
          <Typography>Read value:</Typography>
          <CopyableCodeBlock
            code={`data.(encodevarname('${onekey}'))`}
            language="matlab"
          />
        </Box>
      </TabPanel>

      {/* FLASHCARD 4: Python Local */}
      <TabPanel value={tabIndex} index={3}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Use in Python
          </Typography>
          <Typography>Load:</Typography>
          <CopyableCodeBlock
            code={`import jdata as jd
data = jd.load('${docname}.json')`}
            language="python"
          />
          <Typography>Read value:</Typography>
          <CopyableCodeBlock code={`data["${onekey}"]`} language="python" />
        </Box>
      </TabPanel>

      {/* FLASHCARD 5: C++ */}
      <TabPanel value={tabIndex} index={4}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Use in C++
          </Typography>
          <Typography>Install:</Typography>
          <CopyableCodeBlock
            code={`Download JSON for Modern C++ json.hpp`}
            language="text"
          />
          <Typography>Load:</Typography>
          <CopyableCodeBlock
            code={`#include "json.hpp"
using json=nlohmann::ordered_json;

std::ifstream datafile("${docname}.json");
json data(datafile);`}
            language="cpp"
          />
          <Typography>Read value:</Typography>
          <CopyableCodeBlock
            code={`std::cout << data["${onekey}"];`}
            language="cpp"
          />
        </Box>
      </TabPanel>

      {/* FLASHCARD 6: Node.js */}
      <TabPanel value={tabIndex} index={5}>
        <Box style={flashcardStyles.flashcard}>
          <Typography variant="h6" style={flashcardStyles.flashcardTitle}>
            Use in JS/Node.js
          </Typography>
          <Typography>Install:</Typography>
          <CopyableCodeBlock
            code={`npm install jda numjs pako atob`}
            language="bash"
          />
          <Typography>Load:</Typography>
          <CopyableCodeBlock
            code={`const fs = require("fs");
const jd = require("jda");
global.atob = require("atob");
        
const fn = "${docname}.json";
var jstr = fs.readFileSync(fn).toString().replace(/\\n/g, "");
var data = new jd(JSON.parse(jstr));
data = data.decode();`}
            language="javascript"
          />
          <Typography>Read value:</Typography>
          <CopyableCodeBlock
            code={`console.log(data.data["${onekey}"]);`}
            language="javascript"
          />
        </Box>
      </TabPanel>
    </>
  );
};

export default LoadDatasetTabs;
