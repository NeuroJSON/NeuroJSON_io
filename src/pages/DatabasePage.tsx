import { Box, Typography, Button, Container, Avatar } from "@mui/material";
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
  console.log("registry", registry);

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
    <Container maxWidth="xl">
      <Box sx={{ padding: { xs: 2, md: 4 }, marginTop: { xs: 4 } }}>
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
                  position: "relative", // for overlay positioning
                  padding: 3,
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: Colors.lightGray,
                  // backgroundImage: db.logo ? `url(${db.logo})` : "none",
                  // backgroundSize: "cover",
                  // backgroundPosition: "center",
                  color: Colors.lightGray,
                  borderRadius: 2,
                  transition: "all 0.3s ease",
                  height: "150px",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  overflow: "hidden", // clip overlay inside
                  gap: 1,
                  "&:hover": {
                    borderColor: Colors.lightGray,
                    backgroundColor: Colors.secondaryPurple,
                    transform: "translateY(-2px)",
                    boxShadow: 3,
                  },
                }}
                onClick={() => navigate(`${RoutesEnum.DATABASES}/${db.id}`)}
              >
                {/* Logo as Avatar */}
                {db.logo && (
                  <Avatar
                    variant="square"
                    src={db.logo}
                    alt={db.fullname || "Database Logo"}
                    sx={{
                      width: 46,
                      height: 46,
                      mb: 1,
                      // position: "absolute",
                      // bottom: 5,
                      // right: 5,
                      "& img": {
                        objectFit: "contain", // show full image inside
                      },
                    }}
                  />
                )}

                {/* Overlay for fade/blur */}
                {/* <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.4)", // dark overlay
                    backdropFilter: "blur(4px)",
                    zIndex: 1,
                  }}
                /> */}

                {/* Text goes above overlay */}
                <Box sx={{ zIndex: 2, textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    component="span"
                    sx={{
                      color: Colors.lightGray,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2, // only show 2 lines
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={db.fullname} // tooltip full name
                  >
                    {db.fullname || "Unnamed Database"}
                  </Typography>
                  <Typography
                    sx={{ color: Colors.primary.light }}
                  >{`(${db.name})`}</Typography>
                </Box>
              </Button>
            );
          })}
        </Box>
      </Box>
    </Container>
  );
};

export default DatabasePage;
