import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

function Mails() {
  const [emails, setEmails] = useState([]);
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user, isAuthenticated: auth0Authenticated } = useAuth0();
  const accountCreationAttempted = useRef(false); // Ref to track account creation attempt
  const userCreationAttempted = useRef(false); // Ref to track user creation attempt

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await axios.get('http://localhost:3000/isAuthenticated', { withCredentials: true });
        setIsAuthenticated(response.data.isAuthenticated);
      } catch (error) {
        console.error('Error checking authentication status:', error);
        navigate('/');
      }
    };

    checkAuthentication();
  }, [navigate]);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await fetch('http://localhost:3000/emails', { credentials: 'include' });
        if (response.redirected) {
          navigate('/');
        } else if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setEmails(data);
      } catch (error) {
        console.error('Error fetching emails:', error);
      }
    };

    if (isAuthenticated) {
      fetchEmails();
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const createUser = async () => {
      try {
        const response = await axios.post('http://localhost:3000/createuser', null, {
          headers: {
            id: user.sub, // Assuming user.sub contains a unique identifier
            email: user.email,
            name: user.nickname,
            number: user.phone_number || '1234567890' // Replace with actual phone number if available
          }
        });

        if (response.status === 201) {
          console.log('User created successfully');
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
            'user_id': user.sub,
          },
          withCredentials: true,
        });

        if (response.status === 201) {
          console.log('Account created successfully');
        } else {
          console.error('Failed to create account', response);
        }
      } catch (error) {
        console.error('Error creating account:', error);
      }
    };

    if (auth0Authenticated && isAuthenticated && !userCreationAttempted.current) {
      createUser().then(() => {
        userCreationAttempted.current = true;
        if (!accountCreationAttempted.current) {
          createAccount();
          accountCreationAttempted.current = true; // Set the ref to true after attempting account creation
        }
      });
    } else if (auth0Authenticated && isAuthenticated && userCreationAttempted.current && !accountCreationAttempted.current) {
      createAccount();
      accountCreationAttempted.current = true; // Set the ref to true after attempting account creation
    }
  }, [auth0Authenticated, isAuthenticated, user]);

  return (
    <div>
      <h1>Mails</h1>
      <ul>
        {emails.map((email, index) => (
          <li key={index}>
            <div>Subject: {email.subject}</div>
            <div>Body Preview: {email.body}</div>
            <div>Is Read: {email.isRead ? 'Yes' : 'No'}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Mails;