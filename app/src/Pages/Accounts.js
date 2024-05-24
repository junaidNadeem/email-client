import React, { useState, useEffect } from 'react';
import axios from 'axios'

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
      <a href="http://localhost:3000/auth/outlook"><button disabled={logged} onClick={()=> setlogged(false)}>Log in</button></a>
    </div>
  );
}

export default Accounts;