import { makeParticipantsTable } from "../../utils/DatasetDetailPageFunctions/participants";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useMemo, useState } from "react";

type Props = {
  datasetDocument: any;
};

const ParticipantsPreview: React.FC<Props> = ({ datasetDocument }) => {
  const [open, setOpen] = useState(false);

  const table = useMemo(() => {
    const part = datasetDocument?.["participants.tsv"];
    return makeParticipantsTable(part);
  }, [datasetDocument]);

  if (!table) return null; // No participants.tsv found

  return (
    <>
      <Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setOpen(true)}
          sx={{
            color: Colors.purple,
            borderColor: Colors.purple,
            "&:hover": {
              color: Colors.secondaryPurple,
              transform: "scale(1.01)",
              borderColor: Colors.purple,
            },
          }}
        >
          Participants Table Preview
        </Button>
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>participants.tsv</DialogTitle>
        <DialogContent dividers>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {table.columns.map((col) => (
                    <TableCell
                      key={col}
                      sx={{
                        fontWeight: "bold",
                        backgroundColor: Colors.darkPurple,
                        color: Colors.white,
                      }}
                    >
                      {col.replace(/_/g, " ")}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {table.rows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {table.columns.map((col) => (
                      <TableCell key={col}>{row[col]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ParticipantsPreview;
