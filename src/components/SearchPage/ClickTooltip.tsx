import { Box, Tooltip, ClickAwayListener, TooltipProps } from "@mui/material";
import { useState, PropsWithChildren } from "react";

type ClickTooltipProps = PropsWithChildren<{
  title: TooltipProps["title"];
  placement?: TooltipProps["placement"];
  componentsProps?: TooltipProps["componentsProps"];
}>;

export default function ClickTooltip({
  title,
  placement = "right",
  componentsProps,
  children,
}: ClickTooltipProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => !o);
  const close = () => setOpen(false);

  return (
    <ClickAwayListener onClickAway={close}>
      <Box sx={{ display: "inline-flex" }}>
        <Tooltip
          open={open}
          onClose={close}
          disableFocusListener
          disableHoverListener
          disableTouchListener
          placement={placement}
          componentsProps={componentsProps}
          title={title}
          arrow
        >
          {/* span to ensure Tooltip always has a single DOM child */}
          <span onClick={toggle}>{children}</span>
        </Tooltip>
      </Box>
    </ClickAwayListener>
  );
}
