import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { IconButton, Tooltip } from "@mui/material";
import React, { useState } from "react";

interface CopyButtonProps {
  value: string;
  label?: string;
}

// Small inline "copy to clipboard" icon button with a transient "Copied!" tick.
const CopyButton: React.FC<CopyButtonProps> = ({ value, label = "Copy" }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS) — silently ignore.
    }
  };

  return (
    <Tooltip title={copied ? "Copied!" : label}>
      <IconButton
        size="small"
        onClick={copy}
        sx={{ ml: 0.5, verticalAlign: "middle" }}
        aria-label={label}
      >
        {copied ? (
          <CheckIcon fontSize="inherit" color="success" />
        ) : (
          <ContentCopyIcon fontSize="inherit" />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default CopyButton;
