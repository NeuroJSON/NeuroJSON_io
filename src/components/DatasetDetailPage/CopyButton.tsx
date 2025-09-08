import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { IconButton, Tooltip } from "@mui/material";
import React from "react";

const write = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
};

export default function CopyButton({
  text,
  title = "Copy",
  size = "small",
}: {
  text: string;
  title?: string;
  size?: "small" | "medium" | "large";
}) {
  const [ok, setOk] = React.useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (await write(text)) {
      setOk(true);
      setTimeout(() => setOk(false), 1200);
    }
  };

  return (
    <Tooltip title={ok ? "Copied!" : title} arrow>
      <IconButton size={size} onClick={onClick} sx={{ ml: 0.5 }}>
        {ok ? (
          <CheckIcon fontSize="inherit" />
        ) : (
          <ContentCopyIcon fontSize="inherit" />
        )}
      </IconButton>
    </Tooltip>
  );
}
