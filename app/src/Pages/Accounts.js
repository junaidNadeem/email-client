import React, { useState, useEffect } from 'react';
import axios from 'axios'
import Button from '@mui/material/Button';

function Accounts() {
  const [logged, setlogged] = useState(false)
   // Run the effect whenever id, isAuthenticated, or user changes
   useEffect(()=> {
    const checkAuthentication = async () => {
      try {
        const response = await axios.get('http://localhost:3000/isAuthenticated', { withCredentials: true });
        setlogged(response.data.isAuthenticated);
      } catch (error) {
        console.error('Error checking authentication status:', error);
      }
    };

    checkAuthentication();
   })
  return (
    <div>
      <Button variant='contained' disabled={logged} onClick={()=> setlogged(false)}><a href="http://localhost:3000/auth/outlook">Log in</a></Button>
    </div>
  );
}

export default Accounts;