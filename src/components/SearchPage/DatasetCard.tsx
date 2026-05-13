import DownloadIcon from "@mui/icons-material/Download";
import {
  Typography,
  Card,
  CardContent,
  Stack,
  Chip,
  Button,
  Link as MuiLink,
} from "@mui/material";
import { baseURL } from "services/instance";
import { Colors } from "design/theme";
import React from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

interface MatchingFile {
  key?: any;
  value?: {
    file?: string;
    url?: string;
    path?: string;
    suffix?: string;
    ref?: string;
  };
}

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
  matchingFiles?: MatchingFile[]; // sample of iolinks rows matching file_type
  matchingFilesTotal?: number; // total count across all matches
  fileTypes?: string[]; // the active file_type filter, used to build manifest URL
}

/** ---------- utility helpers ---------- **/
const normalize = (s: string) =>
  s
    ?.replace(/[\u2018\u2019\u2032]/g, "'") // curly → straight
    ?.replace(/[\u201C\u201D\u2033]/g, '"') ?? // curly → straight
  "";

// Multi-word keyword support: backend tsquery treats "head brain" as AND of
// independent tokens. Highlighting should match the same logic — split on
// whitespace and treat each word independently.
const splitKeyword = (kw?: string): string[] => {
  if (!kw) return [];
  return normalize(kw).trim().split(/\s+/).filter(Boolean);
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsKeyword = (text?: string, kw?: string) => {
  if (!text || !kw) return false;
  const t = normalize(text).toLowerCase();
  const words = splitKeyword(kw.toLowerCase());
  return words.some((w) => t.includes(w));
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

  const words = splitKeyword(kw.toLowerCase());
  if (words.length === 0) return null;

  for (const [label, getter] of CANDIDATE_FIELDS) {
    const raw = getter(v); // v = parsedJson.value
    if (!raw) continue;
    const text = normalize(String(raw));
    const lower = text.toLowerCase();

    // Find the earliest occurrence of ANY matching word — that's the snippet anchor.
    let anchor = -1;
    let anchorLen = 0;
    for (const w of words) {
      const i = lower.indexOf(w);
      if (i >= 0 && (anchor < 0 || i < anchor)) {
        anchor = i;
        anchorLen = w.length;
      }
    }
    if (anchor < 0) continue;

    const start = Math.max(0, anchor - 40);
    const end = Math.min(text.length, anchor + anchorLen + 40);
    const slice = text.slice(start, end);

    // Highlight every matching word inside the snippet, not just the first.
    const regex = new RegExp(
      `(${words.map(escapeRegex).join("|")})`,
      "gi"
    );
    const highlighted = slice.replace(regex, "<mark>$1</mark>");
    const html = `${start > 0 ? "…" : ""}${highlighted}${
      end < text.length ? "…" : ""
    }`;
    return { label, html };
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
  matchingFiles,
  matchingFilesTotal,
  fileTypes,
}) => {
  const { name, readme, modality, subj, info } = parsedJson.value;
  const datasetLink = `${RoutesEnum.DATABASES}/${dbname}/${dsname}`;

  // Manifest URL — backend serves a plain-text list of all matching URLs.
  const manifestUrl = useMemo(() => {
    if (!fileTypes || fileTypes.length === 0) return null;
    const ext = fileTypes
      .map((e) => encodeURIComponent(e))
      .join(",");
    return `${baseURL}/dbs/${encodeURIComponent(
      dbname
    )}/${encodeURIComponent(dsname)}/files/manifest?ext=${ext}`;
  }, [dbname, dsname, fileTypes]);

  // Extract a short "sub-XXX" tag from a BIDS path like
  // "$.sub-019.ses-1.nirs.sub-019_ses-1_task-MA_run-01_nirs.snirf.SNIRFData..."
  const subjectFromPath = (p?: string): string => {
    if (!p) return "";
    const m = p.match(/sub-[^.]+/);
    return m ? m[0] : "";
  };

  // File size stored in key[1] of each iolinks row (bytes). Format for humans.
  const formatBytes = (n?: number): string => {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

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

  // keyword highlight functional component (only for visible fields).
  // Splits the keyword on whitespace and highlights each word independently
  // so "head brain" highlights both words wherever they appear.
  const highlightKeyword = (text: string, keyword?: string) => {
    const words = splitKeyword(keyword);
    if (words.length === 0 || !text) return text;
    const lowerWordSet = new Set(words.map((w) => w.toLowerCase()));
    const regex = new RegExp(
      `(${words.map(escapeRegex).join("|")})`,
      "gi"
    );
    if (!regex.test(text)) return text;
    // Reset lastIndex because test() advances on /g regexes; safer to use split.
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          lowerWordSet.has(part.toLowerCase()) ? (
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

          {/* Matching files section — only shown when file_type filter is active */}
          {Array.isArray(matchingFiles) && matchingFiles.length > 0 && (
            <Stack
              spacing={1}
              sx={{
                mt: 2,
                pt: 1.5,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={1}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Matching files
                  {typeof matchingFilesTotal === "number" &&
                    ` (${
                      matchingFiles.length < matchingFilesTotal
                        ? `${matchingFiles.length} of ${matchingFilesTotal}`
                        : matchingFilesTotal
                    })`}
                </Typography>
                {manifestUrl && (
                  <Button
                    component="a"
                    href={manifestUrl}
                    size="small"
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    sx={{
                      color: Colors.purple,
                      borderColor: Colors.purple,
                      textTransform: "none",
                    }}
                  >
                    Download manifest
                    {typeof matchingFilesTotal === "number" &&
                      ` (${matchingFilesTotal} files)`}
                  </Button>
                )}
              </Stack>
              <Stack spacing={0.5} component="ul" sx={{ pl: 2, m: 0 }}>
                {matchingFiles.slice(0, 10).map((f, i) => {
                  const v = f.value || {};
                  const subjTag = subjectFromPath(v.path);
                  const sizeBytes =
                    Array.isArray(f.key) && typeof f.key[1] === "number"
                      ? f.key[1]
                      : undefined;
                  const sizeTag = formatBytes(sizeBytes);
                  const meta = [subjTag, sizeTag].filter(Boolean).join(" · ");
                  return (
                    <li key={i}>
                      <MuiLink
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                        sx={{
                          color: Colors.purple,
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {v.file || v.url}
                      </MuiLink>
                      {meta && (
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ ml: 1, color: "text.secondary" }}
                        >
                          ({meta})
                        </Typography>
                      )}
                    </li>
                  );
                })}
              </Stack>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DatasetCard;
