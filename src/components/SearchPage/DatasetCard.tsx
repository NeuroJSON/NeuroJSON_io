import { Typography, Card, CardContent, Stack, Chip } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

interface DatasetCardProps {
  dbname: string;
  dsname: string;
  parsedJson: {
    key: string;
    value: {
      name?: string;
      readme?: string;
      modality?: string[];
      subj?: string[];
      info?: {
        Authors?: string[];
        DatasetDOI?: string;
        [k: string]: any;
      };
      [k: string]: any;
    };
  };
  index: number;
  onChipClick: (key: string, value: string) => void;
  keyword?: string; // for keyword highlight
}

/** ---------- utility helpers ---------- **/
const normalize = (s: string) =>
  s
    ?.replace(/[\u2018\u2019\u2032]/g, "'") // curly → straight
    ?.replace(/[\u201C\u201D\u2033]/g, '"') ?? // curly → straight
  "";

const containsKeyword = (text?: string, kw?: string) => {
  if (!text || !kw) return false;
  const t = normalize(text).toLowerCase();
  const k = normalize(kw).toLowerCase();
  return t.includes(k);
};

/** Find a short snippet in secondary fields if not already visible */
function findMatchSnippet(
  v: any,
  kw?: string
): { label: string; html: string } | null {
  if (!kw) return null;

  // Which fields to scan (can add/remove fields here)
  const CANDIDATE_FIELDS: Array<[string, (v: any) => string | undefined]> = [
    ["Acknowledgements", (v) => v?.info?.Acknowledgements],
    [
      "Funding",
      (v) =>
        Array.isArray(v?.info?.Funding)
          ? v.info.Funding.join(" ")
          : v?.info?.Funding,
    ],
    ["ReferencesAndLinks", (v) => v?.info?.ReferencesAndLinks],
  ];

  const k = normalize(kw).toLowerCase();

  for (const [label, getter] of CANDIDATE_FIELDS) {
    const raw = getter(v); // v = parsedJson.value
    if (!raw) continue;
    const text = normalize(String(raw));
    const i = text.toLowerCase().indexOf(k); // k is the lowercase version of keyword
    if (i >= 0) {
      const start = Math.max(0, i - 40);
      const end = Math.min(text.length, i + k.length + 40);
      const before = text.slice(start, i);
      const hit = text.slice(i, i + k.length);
      const after = text.slice(i + k.length, end);
      const html = `${
        start > 0 ? "…" : ""
      }${before}<mark>${hit}</mark>${after}${end < text.length ? "…" : ""}`;
      return { label, html };
    }
  }
  return null;
}
/** ---------- end of helpers ---------- **/

const DatasetCard: React.FC<DatasetCardProps> = ({
  dbname,
  dsname,
  parsedJson,
  index,
  onChipClick,
  keyword,
}) => {
  const { name, readme, modality, subj, info } = parsedJson.value;
  const datasetLink = `${RoutesEnum.DATABASES}/${dbname}/${dsname}`;

  // prepare DOI URL
  const rawDOI = info?.DatasetDOI?.replace(/^doi:/, "");
  const doiLink = rawDOI ? `https://doi.org/${rawDOI}` : null;

  // precompute what’s visible & whether it already contains the keyword
  const authorsJoined = Array.isArray(info?.Authors)
    ? info!.Authors.join(", ")
    : typeof info?.Authors === "string"
    ? info!.Authors
    : "";

  const visibleHasKeyword = useMemo(
    () =>
      containsKeyword(name, keyword) ||
      containsKeyword(readme, keyword) ||
      containsKeyword(authorsJoined, keyword),
    [name, readme, authorsJoined, keyword]
  );

  // If not visible, produce a one-line snippet from other fields (for non-visible fields)
  const snippet = useMemo(
    () =>
      !visibleHasKeyword ? findMatchSnippet(parsedJson.value, keyword) : null,
    [parsedJson.value, keyword, visibleHasKeyword]
  );

  // keyword highlight functional component (only for visible fields)
  const highlightKeyword = (text: string, keyword?: string) => {
    if (!keyword || !text?.toLowerCase().includes(keyword.toLowerCase())) {
      return text;
    }

    const regex = new RegExp(`(${keyword})`, "gi"); // for case-insensitive and global
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === keyword.toLowerCase() ? (
            <mark
              key={i}
              style={{ backgroundColor: "yellow", fontWeight: 600 }}
            >
              {part}
            </mark>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </>
    );
  };

  return (
    <Card sx={{ mb: 3, position: "relative" }}>
      <CardContent>
        {/* card number in bottom-right */}
        <Typography
          variant="subtitle2"
          sx={{
            position: "absolute",
            bottom: 8,
            right: 12,
            fontWeight: 600,
            color: Colors.darkPurple,
          }}
        >
          #{index + 1}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: Colors.darkPurple,
            textDecoration: "none",
            ":hover": { textDecoration: "underline" },
          }}
          component={Link}
          to={datasetLink}
          target="_blank"
        >
          {highlightKeyword(name || "Untitled Dataset", keyword)}
        </Typography>
        <Typography>
          {/* Database: {dbname} &nbsp;&nbsp;|&nbsp;&nbsp; Dataset: {dsname} */}
          <strong>Database:</strong> {highlightKeyword(dbname, keyword)}
          {"  "}&nbsp;&nbsp;|&nbsp;&nbsp;{"  "}
          <strong>Dataset:</strong> {highlightKeyword(dsname, keyword)}
        </Typography>

        <Stack spacing={2} margin={1}>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            gap={1}
            alignItems="center"
          >
            <Typography variant="body2" mt={1}>
              <strong>Modalities:</strong>
            </Typography>

            {Array.isArray(modality) && modality.length > 0 ? (
              modality.map((mod, idx) => (
                <Chip
                  key={idx}
                  label={mod}
                  variant="outlined"
                  onClick={() => onChipClick("modality", mod)}
                  sx={{
                    "& .MuiChip-label": {
                      paddingX: "6px",
                      fontSize: "0.8rem",
                    },
                    height: "24px",
                    color: Colors.darkPurple,
                    border: `1px solid ${Colors.darkPurple}`,
                    fontWeight: "bold",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: `${Colors.purple} !important`,
                      color: "white",
                      borderColor: Colors.purple,
                    },
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" mt={1}>
                N/A
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Typography variant="body2" mt={1}>
              <strong>Subjects:</strong> {subj && `${subj.length} subjects`}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {readme && (
              <Typography
                variant="body2"
                paragraph
                sx={{ textOverflow: "ellipsis" }}
              >
                <strong>Summary:</strong> {highlightKeyword(readme, keyword)}
              </Typography>
            )}
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {info?.Authors?.length && (
              <Typography variant="body2" mt={1}>
                {info?.Authors && (
                  <Typography variant="body2" mt={1}>
                    <strong>Authors:</strong>{" "}
                    {highlightKeyword(authorsJoined || "N/A", keyword)}
                  </Typography>
                )}
              </Typography>
            )}
          </Stack>

          {/* show why it matched if not visible in main fields */}
          {snippet && (
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip
                label={`Matched in ${snippet.label}`}
                size="small"
                sx={{
                  height: 22,
                  backgroundColor: "#f9f9ff",
                  color: Colors.darkPurple,
                  border: `1px solid ${Colors.lightGray}`,
                }}
              />
              <Typography
                variant="body2"
                sx={{ mt: 0.5 }}
                // safe: snippet is derived from our own strings with <mark> only
                dangerouslySetInnerHTML={{ __html: snippet.html }}
              />
            </Stack>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {doiLink && (
              <Stack mt={1}>
                <Chip
                  label="DOI"
                  component="a"
                  href={doiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  clickable
                  sx={{
                    "& .MuiChip-label": {
                      paddingX: "8px",
                      fontSize: "0.8rem",
                    },
                    height: "24px",
                    backgroundColor: Colors.accent,
                    color: "white",
                  }}
                />
              </Stack>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DatasetCard;
