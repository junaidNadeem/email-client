import React from 'react';
import { Button, Typography, Box } from '@mui/material';
import useAuth from '../hooks/useAuth';

const Accounts = () => {
  const { isAuthenticated, resetAuthStatus } = useAuth();

  const handleOnClick = () => {
    resetAuthStatus();
  };

  return (
    <Box
      marginTop={4}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="h4" gutterBottom>
        {isAuthenticated ? 'You are logged in' : 'You are not logged in'}
      </Typography>
      <Button
        variant="contained"
        color="primary"
        disabled={isAuthenticated}
        onClick={handleOnClick}
        sx={{ marginTop: '16px' }}
      >
        <a
          href="http://localhost:3000/auth/outlook"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          Log in with Outlook
        </a>
      </Button>
    </Box>
  );
};

export default Accounts;
