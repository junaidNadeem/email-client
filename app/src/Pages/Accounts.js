import React, { useState, useEffect } from "react";
import axios from "axios";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

function Accounts() {
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await axios.get("http://localhost:3000/isAuthenticated", {
          withCredentials: true,
        });
        setLogged(response.data.isAuthenticated);
      } catch (error) {
        console.error("Error checking authentication status:", error);
      }
    };

    checkAuthentication();
  }, []);

  return (
    <Box
      marginTop={4}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>
        {logged ? "You are logged in" : "You are not logged in"}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        disabled={logged}
        onClick={() => setLogged(true)}
        sx={{ marginTop: "16px" }}
      >
        Log in with Outlook
      </Button>
    </Box>
  );
}

export default Accounts;
