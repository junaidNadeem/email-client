import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Container, Box } from '@mui/material';

function Login() {
  const { loginWithRedirect, isAuthenticated, user, logout } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/MainPage/`);
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated) {
    return (
      <div>
        <h2>Welcome, {user.name}</h2>
        <img src={user.picture} alt={user.name} />
        <p>{user.email}</p>
        <button onClick={() => logout({ returnTo: window.location.origin })}>
          Log Out
        </button>
      </div>
    );
  }
  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography variant="h2" gutterBottom>
          Welcome to Email Client
        </Typography>
        <Typography variant="body1" paragraph align="center">
          Access your emails with ease.
        </Typography>
        <Button
          onClick={loginWithRedirect}
          variant="contained"
          size="large"
          color="primary"
        >
          Get Started
        </Button>
      </Box>
    </Container>
  );
}

export default Login;
