import { useState, useEffect } from 'react';
import { fetchEmails } from '../services/apiService';

const useEmails = (isAuthenticated) => {
  const [emails, setEmails] = useState([]);

  useEffect(() => {
    getEmails();
  }, [isAuthenticated]);

  const getEmails = async () => {
    if (isAuthenticated) {
      try {
        const emailData = await fetchEmails();
        setEmails(emailData);
      } catch (error) {
        console.error('Error fetching emails:', error);
      }
    }
  };
  return { emails, fetchEmails: getEmails };
};

export default useEmails;
