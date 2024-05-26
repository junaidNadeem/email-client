import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

function Mails() {
  const [emails, setEmails] = useState([]);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user, isAuthenticated: auth0Authenticated } = useAuth0();

  const userCreationAttempted = useRef(
    sessionStorage.getItem('UserCreationAttempted') === 'true',
  );
  const accountCreationAttempted = useRef(
    sessionStorage.getItem('AccountCreationAttempted') === 'true',
  );

  const checkAuthentication = async () => {
    try {
      const response = await axios.get(
        'http://localhost:3000/isAuthenticated',
        {
          withCredentials: true,
        },
      );
      setIsAuthenticated(response.data.isAuthenticated);
    } catch (error) {
      console.error('Error checking authentication status:', error);
      navigate('/');
    }
  };

  const fetchEmails = async () => {
    try {
      const response = await fetch('http://localhost:3000/emails', {
        credentials: 'include',
      });
      if (response.redirected) {
        navigate('/');
      } else if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      // Sort emails by creationDateTime before setting the state
      const sortedEmails = data.sort(
        (a, b) => new Date(b.datetime) - new Date(a.datetime),
      );
      setEmails(sortedEmails);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const createUser = async () => {
    try {
      const response = await axios.post(
        'http://localhost:3000/createuser',
        null,
        {
          headers: {
            id: user.sub,
            email: user.email,
            name: user.nickname,
            number: user.phone_number || 'null',
          },
        },
      );
      if (response.status === 201) {
        sessionStorage.setItem('UserCreationAttempted', 'true');
      } else {
        console.error('Failed to create user', response);
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const createAccount = async () => {
    try {
      const response = await axios.get('http://localhost:3000/createaccount', {
        headers: {
          user_id: user.sub,
        },
        withCredentials: true,
      });
      if (response.status === 201) {
        sessionStorage.setItem('AccountCreationAttempted', 'true');
      } else {
        console.error('Failed to create account', response);
      }
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleRefresh = () => {
    // Simply refetch emails to refresh the component
    fetchEmails();
  };

  useEffect(() => {
    checkAuthentication();
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEmails();
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handleUserAndAccountCreation = async () => {
      if (auth0Authenticated && isAuthenticated) {
        if (!userCreationAttempted.current) {
          await createUser();
          userCreationAttempted.current = true;
        }
        if (!accountCreationAttempted.current) {
          await createAccount();
          accountCreationAttempted.current = true;
        }
      }
    };

    handleUserAndAccountCreation();
  }, [auth0Authenticated, isAuthenticated, user]);

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
        <Button
          variant="contained"
          onClick={handleRefresh}
          sx={{ marginBottom: 2 }}
        >
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
                <TableCell>
                  {new Date(email.datetime).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default Mails;
