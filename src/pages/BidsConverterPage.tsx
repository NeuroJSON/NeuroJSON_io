import DropZone from "components/User/Dashboard/DatasetOrganizer/DropZone";
import FileTree from "components/User/Dashboard/DatasetOrganizer/FileTree";
import LLMPanel from "components/User/Dashboard/DatasetOrganizer/LLMPanel";
import UserLogin from "components/User/UserLogin";
import UserSignup from "components/User/UserSignup";
import {
  ArrowBack,
  GetApp,
  Psychology,
  LockOutlined,
  CloudUpload,
  InfoOutlined,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Typography,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  IconButton,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthSelector } from "redux/auth/auth.selector";
import { FileItem } from "redux/projects/types/projects.interface";

type Mode = "private" | "save";

const BidsConverterPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAppSelector(AuthSelector);

  const [modeChosen, setModeChosen] = useState(false);
  const [mode, setMode] = useState<Mode>("private");
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showLLMPanel, setShowLLMPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseDirectoryPath, setBaseDirectoryPath] = useState<string>("");
  const [evidenceBundle, setEvidenceBundle] = useState<any>(null);
  const [trioGenerated, setTrioGenerated] = useState(false);

  // After login succeeds in save mode, redirect to dashboard to create a project
  useEffect(() => {
    if (isLoggedIn && mode === "save") {
      navigate("/dashboard?tab=projects");
    }
  }, [isLoggedIn, mode, navigate]);

  const handleChoosePrivate = () => {
    setMode("private");
    setModeChosen(true);
  };

  const handleChooseSave = () => {
    setMode("save");
    if (isLoggedIn) {
      navigate("/dashboard?tab=projects");
    } else {
      setLoginOpen(true);
    }
  };

  const handleModeBarChange = (_: React.MouseEvent, next: Mode | null) => {
    if (!next || next === mode) return;
    if (next === "save") {
      handleChooseSave();
    } else {
      setMode("private");
    }
  };

  const updateFiles = (updater: React.SetStateAction<FileItem[]>) =>
    setFiles(updater);
  const updateSelectedIds = (updater: React.SetStateAction<Set<string>>) =>
    setSelectedIds(updater);
  const updateExpandedIds = (updater: React.SetStateAction<Set<string>>) =>
    setExpandedIds(updater);
  const updateBaseDirectoryPath = (path: string) => setBaseDirectoryPath(path);

  const handleExportJSON = () => {
    // Strip the leading folder name from sourcePath if it duplicates the last
    // segment of baseDirectoryPath (e.g. user typed /Desktop/dataset1 and
    // sourcePath is dataset1/file.dcm → result should be /Desktop/dataset1/file.dcm)
    const resolveSourcePath = (sourcePath: string | undefined, fallback: string): string => {
      const raw = sourcePath || fallback;
      if (!baseDirectoryPath) return raw;
      const base = baseDirectoryPath.replace(/\/+$/, "");
      const baseName = base.split("/").pop() || "";
      if (baseName && raw === baseName) return base;
      if (baseName && raw.startsWith(baseName + "/")) return `${base}/${raw.slice(baseName.length + 1)}`;
      return `${base}/${raw}`.replace(/\/+/g, "/");
    };

    const buildTree = (parentId: string | null): any => {
      const children = files.filter((f) => f.parentId === parentId);
      const result: any = {};
      children.forEach((child) => {
        if (child.type === "folder" || child.type === "zip") {
          result[child.name] = {
            _type: child.type,
            _sourcePath: resolveSourcePath(child.sourcePath, child.name),
            _children: buildTree(child.id),
          };
        } else {
          const fileData: any = {
            _type: "file",
            _fileType: child.fileType || "other",
          };
          if (child.sourcePath || baseDirectoryPath) {
            fileData._sourcePath = resolveSourcePath(child.sourcePath, child.name);
          }
          if (child.isUserMeta) fileData._isUserMeta = true;
          if (child.content) fileData._content = child.content;
          if (child.contentType) fileData._contentType = child.contentType;
          if (child.note) fileData._note = child.note;
          result[child.name] = fileData;
        }
      });
      return result;
    };

    const exportData = {
      _exportDate: new Date().toISOString(),
      _totalFiles: files.length,
      files: buildTree(null),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bids_converter_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: mode === "private"
          ? "linear-gradient(180deg, #eceff1 0%, #90a4ae 100%)"
          : "linear-gradient(180deg,#f6f7fb 0%, #aeb6e8 100%)",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/")}
            sx={{ color: Colors.purple }}
          >
            Back
          </Button>
          <Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Typography variant="h5">AutoBIDSify</Typography>
              <Tooltip
                title={
                  <Box>
                    <Typography variant="body2" fontWeight={600} mb={0.5}>How to use:</Typography>
                    <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                      <li>Drop your dataset files into the workspace.</li>
                      <li>Enter the number of subjects, modality, and base directory path.</li>
                      <li>The AI will analyze your files and generate a BIDS conversion plan.</li>
                      <li>Download the conversion bundle and the AutoBIDSify Converter, then run the Converter locally to reorganize your data into BIDS format.</li>
                    </Typography>
                    <Typography
                      variant="body2"
                      onClick={() => navigate("/about")}
                      sx={{ mt: 1, color: Colors.purple, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Watch video tutorial
                    </Typography>
                  </Box>
                }
                placement="bottom-start"
                arrow
                componentsProps={{
                  tooltip: {
                    sx: {
                      backgroundColor: "white",
                      color: Colors.darkPurple,
                      border: `1px solid ${Colors.lightGray}`,
                      boxShadow: 3,
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                      p: 1.5,
                      maxWidth: 320,
                    },
                  },
                  arrow: {
                    sx: {
                      color: "white",
                      "&::before": { border: `1px solid ${Colors.lightGray}` },
                    },
                  },
                }}
              >
                <IconButton size="small" sx={{ color: Colors.purple, p: 0 }}>
                  <InfoOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2" color="text.secondary">
              An LLM-powered tool for automatically converting neuroimaging datasets into BIDS-compliant format.{" "}
              <Typography
                component="span"
                variant="body2"
                onClick={() => window.open("https://github.com/COTILab/autobidsify", "_blank")}
                sx={{ color: Colors.purple, cursor: "pointer", textDecoration: "underline" }}
              >
                Learn more
              </Typography>
            </Typography>
          </Box>
        </Box>

        <Box display="flex" flexDirection="column" gap={1} alignItems="flex-end">
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<Psychology />}
              onClick={() => setShowLLMPanel(!showLLMPanel)}
              sx={{
                backgroundColor: Colors.purple,
                color: Colors.lightGray,
                "&:hover": { backgroundColor: Colors.purple, border: "none" },
              }}
            >
              AI Assistant
            </Button>
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={() => {
                const ua = navigator.userAgent.toLowerCase();
                const os = ua.includes("win") ? "windows" : ua.includes("linux") ? "linux" : "mac";
                const urls: Record<string, string> = {
                  mac: "https://github.com/NeuroJSON/autobidsifyAPP/releases/download/latest-execval/AutoBIDSify-ExecVal-macOS-arm64.zip",
                  windows: "https://github.com/NeuroJSON/autobidsifyAPP/releases/download/latest-execval/AutoBIDSify-ExecVal-Windows.zip",
                  linux: "https://github.com/NeuroJSON/autobidsifyAPP/releases/download/latest-execval/AutoBIDSify-ExecVal-Linux.tar.gz",
                };
                window.open(urls[os], "_blank");
              }}
              sx={{ borderColor: Colors.purple, color: Colors.purple, textTransform: "none" }}
            >
              Download Converter
            </Button>
          </Box>
          <Button
            variant="contained"
            startIcon={<GetApp />}
            onClick={handleExportJSON}
            disabled={files.length === 0}
            sx={{
              backgroundColor: Colors.darkGreen,
              color: Colors.lightGray,
              "&:hover": { backgroundColor: Colors.darkGreen, border: "none" },
            }}
          >
            Export JSON
          </Button>
        </Box>
      </Box>

      {/* Mode indicator bar */}
      <Box
        sx={{
          px: 3,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 2,
          backgroundColor: mode === "private" ? "#eceff1" : "white",
        }}
      >
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={handleModeBarChange}
          size="small"
        >
          <ToggleButton
            value="private"
            sx={{
              gap: 0.5,
              textTransform: "none",
              "&.Mui-selected": {
                backgroundColor: Colors.purple,
                color: Colors.white,
                "&:hover": { backgroundColor: Colors.secondaryPurple },
              },
            }}
          >
            <LockOutlined fontSize="small" />
            Private Mode
          </ToggleButton>
          <ToggleButton
            value="save"
            sx={{
              gap: 0.5,
              textTransform: "none",
              "&.Mui-selected": {
                backgroundColor: Colors.lightBlue,
                color: Colors.darkPurple,
              },
            }}
          >
            <CloudUpload fontSize="small" />
            Save to Account
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="caption" color="text.secondary">
          {mode === "private"
            ? "Files are processed locally. Nothing is uploaded. All data is lost when you close this page."
            : "Log in to save your work to a project on your account."}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: 1, overflow: "auto", p: 3, position: "relative" }}>
          <DropZone
            files={files}
            setFiles={updateFiles}
            baseDirectoryPath={baseDirectoryPath}
            setBaseDirectoryPath={updateBaseDirectoryPath}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            expandedIds={expandedIds}
            setExpandedIds={setExpandedIds}
          />
          {showLLMPanel && (
            <LLMPanel
              files={files}
              baseDirectoryPath={baseDirectoryPath}
              setBaseDirectoryPath={updateBaseDirectoryPath}
              evidenceBundle={evidenceBundle}
              setEvidenceBundle={setEvidenceBundle}
              trioGenerated={trioGenerated}
              setTrioGenerated={setTrioGenerated}
              updateFiles={updateFiles}
              onClose={() => setShowLLMPanel(false)}
              isPrivateMode={mode === "private"}
            />
          )}
        </Box>

        <FileTree
          files={files}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          setFiles={updateFiles}
          setSelectedIds={updateSelectedIds}
          setExpandedIds={updateExpandedIds}
          baseDirectoryPath={baseDirectoryPath}
          setBaseDirectoryPath={updateBaseDirectoryPath}
        />
      </Box>

      {/* Welcome dialog — shown on first load before user starts working */}
      <Dialog open={!modeChosen} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ textAlign: "center", pt: 4 }}>
          How would you like to use AutoBIDSify?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
            An LLM-powered tool for automatically converting neuroimaging datasets into BIDS-compliant format.{" "}
            <Typography
              component="span"
              variant="body2"
              onClick={() => window.open("https://github.com/COTILab/autobidsify", "_blank")}
              sx={{ color: Colors.purple, cursor: "pointer", textDecoration: "underline" }}
            >
              Learn more
            </Typography>
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              mt: 1,
              mb: 2,
              flexDirection: { xs: "column", sm: "row" },
            }}
          >
            {/* Private Mode card */}
            <Box
              onClick={handleChoosePrivate}
              sx={{
                flex: 1,
                border: `2px solid ${Colors.purple}`,
                borderRadius: 2,
                p: 3,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                transition: "background 0.2s",
                "&:hover": { backgroundColor: Colors.lightBlue },
              }}
            >
              <LockOutlined sx={{ fontSize: 40, color: Colors.purple }} />
              <Typography variant="h6" fontWeight={600}>
                Private Mode
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
              >
                Work entirely in your browser. No files are uploaded to any
                server. All data will be lost when you close the page.
              </Typography>
            </Box>

            {/* Save to Account card */}
            <Box
              onClick={handleChooseSave}
              sx={{
                flex: 1,
                border: `2px solid ${Colors.darkGreen}`,
                borderRadius: 2,
                p: 3,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                transition: "background 0.2s",
                "&:hover": { backgroundColor: "#e8f5e9" },
              }}
            >
              <CloudUpload sx={{ fontSize: 40, color: Colors.darkGreen }} />
              <Typography variant="h6" fontWeight={600}>
                Save to Account
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
              >
                Log in to save your work to a project. You can resume it any
                time from your dashboard.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <UserLogin
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false);
          // If user closes login without logging in, fall back to private mode
          if (!isLoggedIn) {
            setMode("private");
            setModeChosen(true);
          }
        }}
        onSwitchToSignup={() => {
          setLoginOpen(false);
          setSignupOpen(true);
        }}
      />
      <UserSignup
        open={signupOpen}
        onClose={() => {
          setSignupOpen(false);
          if (!isLoggedIn) {
            setMode("private");
            setModeChosen(true);
          }
        }}
        onSwitchToLogin={() => {
          setSignupOpen(false);
          setLoginOpen(true);
        }}
      />
    </Box>
  );
};

export default BidsConverterPage;
