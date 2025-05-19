import { Box, Typography, Button, Container } from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRegistry } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";
import RoutesEnum from "types/routes.enum";

const DatabasePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { registry } = useAppSelector(NeurojsonSelector);

  useEffect(() => {
    dispatch(fetchRegistry());
  }, [dispatch]);

  if (!registry || !Array.isArray(registry) || registry.length === 0) {
    return (
      <Container maxWidth="md">
        <Box
          sx={{
            textAlign: "center",
            padding: 8,
            backgroundColor: Colors.lightGray,
            borderRadius: 2,
            margin: "2rem auto",
          }}
        >
          <Typography variant="h2" color={Colors.secondary.main} gutterBottom>
            No Databases Found
          </Typography>
          <Typography variant="body1" color={Colors.textSecondary}>
            Please check back later or contact support if this persists.
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ padding: { xs: 2, md: 4 } }}>
        <Typography variant="h1" gutterBottom sx={{ color: Colors.green }}>
          Databases
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
            },
            gap: 3,
            mt: 4,
          }}
        >
          {registry.map((db) => {
            if (!db?.id) {
              console.warn("Database entry missing ID:", db);
              return null;
            }

            return (
              <Button
                key={db.id}
                variant="outlined"
                sx={{
                  padding: 3,
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: Colors.lightGray,
                  color: Colors.lightGray,
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                  height: "100px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  "&:hover": {
                    borderColor: Colors.lightGray,
                    backgroundColor: Colors.secondaryPurple,
                    transform: "translateY(-2px)",
                    boxShadow: 3,
                  },
                }}
                // onClick={() => navigate(`/databases/${db.id}`)}
                onClick={() => navigate(`${RoutesEnum.DATABASES}/${db.id}`)}
              >
                <Typography variant="h6" component="span">
                  {db.name || "Unnamed Database"}
                </Typography>
              </Button>
            );
          })}
        </Box>
      </Box>
    </Container>
  );
};

export default DatabasePage;
