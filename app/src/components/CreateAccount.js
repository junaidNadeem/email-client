import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function CreateAccount() {
  const [email, setEmail] = useState('');
  const { user, isAuthenticated } = useAuth0();

  const handleCreateAccount = async () => {
    if (!isAuthenticated) {
      console.error('User is not authenticated');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/createaccount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'id': email,
          'user_id': user.email,
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        window.location.href = 'http://localhost:3000/auth/outlook';
      } else {
        const errorData = await response.json();
        console.error('Failed to create account:', errorData.message);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <>
      <input 
        type='email' 
        placeholder='Enter Email to attach' 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleCreateAccount}>Create Account</button>
    </>
  );
}

export default CreateAccount;