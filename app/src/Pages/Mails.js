import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Mails() {
  const [emails, setEmails] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmails = async () => {   
      try {
        const response = await fetch('http://localhost:3000/emails', { credentials: 'include' });
        if (response.redirected) {
          // Redirect to home page if not authenticated
          navigate('/');
        } else if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setEmails(data); // Directly set the emails from the response
      } catch (error) {
        console.error('Error fetching emails:', error);
        // Handle error
      }
    };

    fetchEmails();
  }, [navigate]);

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