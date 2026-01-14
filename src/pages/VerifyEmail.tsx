import { CheckCircle, Error } from "@mui/icons-material";
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Button,
  Alert,
  Paper,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCurrentUser } from "redux/auth/auth.action";

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams(); // don't need setSearchParams
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  //add
  const hasVerified = useRef(false);

  useEffect(() => {
    // prevent duplicate verification attempts
    if (hasVerified.current) {
      return;
    }
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        return;
      }
      //mark as processing
      hasVerified.current = true;

      try {
        const response = await fetch(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1"
          }/auth/verify-email?token=${token}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message);
          await dispatch(getCurrentUser());
          setTimeout(() => navigate("/"), 3000);
        } else {
          setStatus("error");
          setMessage(data.message);
          setIsExpired(data.expired || false);
        }
      } catch (error) {
        setStatus("error");
        setMessage("Failed to verify email. Please try again.");
      }
    };

    verifyEmail();
  }, [searchParams, navigate, dispatch]);

  const handleResendEmail = () => {
    navigate("/resend-verification");
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: 2,
            width: "100%",
          }}
        >
          {status === "loading" && (
            <>
              <CircularProgress
                size={60}
                sx={{ mb: 3, color: Colors.purple }}
              />
              <Typography variant="h5" gutterBottom>
                Verifying Your Email...
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Please wait while we verify your email address.
              </Typography>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle
                sx={{ fontSize: 80, color: "success.main", mb: 2 }}
              />
              <Typography variant="h4" gutterBottom color="success.main">
                Email Verified!
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {message}
              </Typography>
              <Alert severity="success" sx={{ mb: 2 }}>
                You will be redirected to the home page in a few seconds...
              </Alert>
              <Button
                variant="contained"
                onClick={() => navigate("/")}
                sx={{
                  backgroundColor: Colors.purple,
                  color: Colors.white,
                  "&:hover": {
                    backgroundColor: Colors.secondaryPurple,
                  },
                }}
              >
                Go to Home Now
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <Error sx={{ fontSize: 80, color: "error.main", mb: 2 }} />
              <Typography variant="h4" gutterBottom color="error.main">
                Verification Failed
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {message}
              </Typography>
              {isExpired && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Your verification link has expired. Please request a new one.
                </Alert>
              )}
              <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
                {isExpired && (
                  <Button
                    variant="contained"
                    onClick={handleResendEmail}
                    sx={{
                      backgroundColor: Colors.purple,
                      color: Colors.white,
                      "&:hover": {
                        backgroundColor: Colors.secondaryPurple,
                      },
                    }}
                  >
                    Resend Verification Email
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={() => navigate("/")}
                  sx={{
                    borderColor: Colors.purple,
                    color: Colors.purple,
                    "&:hover": {
                      borderColor: Colors.secondaryPurple,
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                    },
                  }}
                >
                  Back to Home
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default VerifyEmail;
