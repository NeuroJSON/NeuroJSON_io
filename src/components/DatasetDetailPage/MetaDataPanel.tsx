import ArrowCircleRightIcon from "@mui/icons-material/ArrowCircleRight";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Colors } from "design/theme";
import pako from "pako";
import React, { useMemo, useState } from "react";
import { modalityValueToEnumLabel } from "utils/SearchPageFunctions/modalityLabels";

type Props = {
  dbViewInfo: any;
  datasetDocument: any;
  dbName: string | undefined;
  docId: string | undefined;
  // NEW:
  currentRev?: string; // from URL (?rev=...)
  onChangeRev?: (rev?: string | null) => void; // to update URL
  revsList?: { rev: string }[];
};

type RevInfo = { rev: string };

const MetaDataPanel: React.FC<Props> = ({
  dbViewInfo,
  datasetDocument,
  dbName,
  docId,
  currentRev,
  onChangeRev,
  revsList = [], // default empty
}) => {
  // const revs: RevInfo[] = useMemo(
  //   () =>
  //     Array.isArray(datasetDocument?.["_revs_info"])
  //       ? (datasetDocument!["_revs_info"] as RevInfo[])
  //       : [],
  //   [datasetDocument]
  // );
  const revs = revsList;

  // derive index from currentRev; fallback to 0 (latest)
  const deriveIdx = React.useCallback((revList: RevInfo[], cur?: string) => {
    if (!revList.length) return 0;
    if (!cur) return 0;
    const idx = revList.findIndex((r) => r.rev === cur);
    return idx >= 0 ? idx : 0;
  }, []);

  const [revIdx, setRevIdx] = useState<number>(deriveIdx(revs, currentRev));

  // keep local idx synced when URL rev or list changes
  React.useEffect(() => {
    setRevIdx(deriveIdx(revs, currentRev));
  }, [revs, currentRev, deriveIdx]);

  const selected = revs[revIdx];
  // const [revIdx, setRevIdx] = useState(0);
  // const selected = revs[revIdx];

  // builds /search#query=<deflated-base64>
  const buildSearchUrl = (query: Record<string, any>) => {
    const deflated = pako.deflate(JSON.stringify(query));
    const encoded = btoa(String.fromCharCode(...deflated));
    return `${window.location.origin}/search#query=${encoded}`;
  };

  const openSearchForModality = (mod: string) => {
    const normalized = modalityValueToEnumLabel[mod] || mod;
    const url = buildSearchUrl({ modality: normalized });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0, // <-- for scroller
          overflowY: "auto", // <-- keep the scroller here
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            Modalities
          </Typography>

          {(() => {
            const mods = Array.isArray(dbViewInfo?.rows?.[0]?.value?.modality)
              ? [...new Set(dbViewInfo.rows[0].value.modality as string[])]
              : [];

            if (mods.length === 0) {
              return (
                <Typography sx={{ color: "text.secondary" }}>N/A</Typography>
              );
            }

            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}>
                {mods.map((m) => (
                  <Chip
                    key={m}
                    label={m}
                    clickable
                    onClick={() => openSearchForModality(m)}
                    variant="outlined"
                    sx={{
                      "& .MuiChip-label": {
                        paddingX: "7px",
                        fontSize: "0.8rem",
                      },
                      height: "24px",
                      color: Colors.white,
                      border: `1px solid ${Colors.orange}`,
                      fontWeight: "bold",
                      transition: "all 0.2s ease",
                      backgroundColor: `${Colors.orange} !important`,
                      "&:hover": {
                        backgroundColor: `${Colors.darkOrange} !important`,
                        color: "white",
                        borderColor: Colors.darkOrange,
                        paddingX: "8px",
                        fontSize: "1rem",
                      },
                    }}
                  />
                ))}
              </Box>
            );
          })()}
          {/* <Typography sx={{ color: "text.secondary" }}>
            {dbViewInfo?.rows?.[0]?.value?.modality?.join(", ") ?? "N/A"}
          </Typography> */}
        </Box>
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            DOI
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {(() => {
              const doi =
                datasetDocument?.["dataset_description.json"]?.DatasetDOI ||
                datasetDocument?.["dataset_description.json"]?.ReferenceDOI;

              if (!doi) return "N/A";

              // Normalize into a clickable URL
              let url = doi;
              if (/^10\./.test(doi)) {
                url = `https://doi.org/${doi}`;
              } else if (/^doi:/.test(doi)) {
                url = `https://doi.org/${doi.replace(/^doi:/, "")}`;
              }

              return (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "inherit",
                    textDecoration: "underline",
                  }}
                >
                  {url}
                </a>
              );
            })()}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            Subjects
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {dbViewInfo?.rows?.[0]?.value?.subj?.length ?? "N/A"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            License
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {datasetDocument?.["dataset_description.json"]?.License ?? "N/A"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            BIDS Version
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {datasetDocument?.["dataset_description.json"]?.BIDSVersion ??
              "N/A"}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ color: Colors.darkPurple, fontWeight: "600" }}>
            References and Links
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>
            {Array.isArray(
              datasetDocument?.["dataset_description.json"]?.ReferencesAndLinks
            )
              ? datasetDocument["dataset_description.json"].ReferencesAndLinks
                  .length > 0
                ? datasetDocument[
                    "dataset_description.json"
                  ].ReferencesAndLinks.join(", ")
                : "N/A"
              : datasetDocument?.["dataset_description.json"]
                  ?.ReferencesAndLinks ?? "N/A"}
          </Typography>
        </Box>

        {revs.length > 0 && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: `1px solid ${Colors.lightGray}`,
              borderRadius: 1,
            }}
          >
            <Typography
              //   variant="subtitle1"
              sx={{ mb: 1, fontWeight: 600, color: Colors.darkPurple }}
            >
              Revisions
            </Typography>

            <FormControl
              fullWidth
              size="small"
              sx={{
                mb: 1,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: Colors.green,
                  },
                  "&:hover fieldset": {
                    borderColor: Colors.green,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: Colors.green,
                  },
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: Colors.green,
                },
              }}
            >
              <InputLabel id="rev-select-label">Select revision</InputLabel>
              <Select
                labelId="rev-select-label"
                label="Select revision"
                value={revIdx}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  setRevIdx(idx);
                  const chosen = revs[idx]?.rev;
                  // update URL -> parent will refetch with ?rev=chosen
                  onChangeRev?.(chosen || null);
                }}
                // onChange={(e) => setRevIdx(Number(e.target.value))}
              >
                {revs.map((r, idx) => {
                  const [verNum, hash] = r.rev.split("-", 2);
                  return (
                    <MenuItem key={r.rev} value={idx}>
                      <Typography component="span">
                        Revision {verNum} ({r.rev.slice(0, 8)}…{r.rev.slice(-4)}
                        )
                      </Typography>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {selected && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Selected rev:
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
                    title={selected.rev}
                  >
                    {selected.rev}
                  </Typography>
                </Box>
                <Tooltip title="Open this revision in NeuroJSON.io">
                  <IconButton
                    size="small"
                    onClick={() =>
                      window.open(
                        `https://neurojson.io:7777/${dbName}/${docId}?rev=${selected.rev}`,
                        "_blank"
                      )
                    }
                  >
                    <ArrowCircleRightIcon
                      fontSize="small"
                      sx={{
                        color: Colors.green,
                      }}
                    />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MetaDataPanel;
