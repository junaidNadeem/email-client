import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import useAuth from '../hooks/useAuth';
import useEmails from '../hooks/useEmails';
import { createUser, createAccount } from '../services/apiService';
import { useAuth0 } from '@auth0/auth0-react';

import {
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
} from '@mui/material';

const Mails = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated: isAuth0Authenticated } = useAuth0();
  const { isAuthenticated } = useAuth();
  const { emails, fetchEmails } = useEmails(isAuthenticated);

  const isUserCreated = useRef(sessionStorage.getItem('isUserCreated') === 'true');
  const isAccountCreated = useRef(sessionStorage.getItem('isAccountCreated') === 'true');

  useEffect(() => {
    const createUserAndAccount = async () => {
      if (!isAuthenticated) return;

      if (isAuth0Authenticated && user) {
        if (!isUserCreated.current) {
          const userCreated = await createUser(user);
          isUserCreated.current = userCreated;
          sessionStorage.setItem('isUserCreated', 'true');
        }
        if (!isAccountCreated.current) {
          const accountCreated = await createAccount(user.sub);
          isAccountCreated.current = accountCreated;
          sessionStorage.setItem('isAccountCreated', 'true');
        }
      } else {
        navigate('/');
      }
    };

    createUserAndAccount();
  }, [isAuth0Authenticated, isAuthenticated, user, navigate]);

  const handleRefresh = () => {
    fetchEmails();
  };

  return (
    <div>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={1}
      >
        <Typography variant="h4" gutterBottom>
          Mails
        </Typography>
        <Button variant="contained" onClick={handleRefresh} sx={{ marginBottom: 2 }}>
          Refresh
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ fontWeight: 'bold' }}>
              <TableCell>Subject</TableCell>
              <TableCell>Body Preview</TableCell>
              <TableCell>Is Read</TableCell>
              <TableCell>Creation Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {emails.map((email, index) => (
              <TableRow key={index}>
                <TableCell>{email.subject}</TableCell>
                <TableCell>{email.body}</TableCell>
                <TableCell>{email.isRead ? 'Yes' : 'No'}</TableCell>
                <TableCell>{new Date(email.datetime).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Mails;
