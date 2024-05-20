import { useAuth0 } from '@auth0/auth0-react';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import NotFound from '../components/NotFound';
import CreateAccount from '../components/CreateAccount';

function Accounts() {
  const { id } = useParams();
  const [linkedAccounts, setLinkedAccounts] = useState([]);
  const [noAccounts, setNoAccounts] = useState(false); // State to track if no accounts are found
  const { user, isAuthenticated } = useAuth0(); // Destructure user and isAuthenticated from useAuth0

  useEffect(() => {
    // Fetch data from the backend when component mounts and when user changes
    if (isAuthenticated && user?.email) {
      fetch(`http://localhost:3000/user/${user.email}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          if (!data.accounts || data.accounts.length === 0) {
            // Set state to indicate no accounts found
            setNoAccounts(true);
          } else {
            setLinkedAccounts(data.accounts);
            setNoAccounts(false); // Reset noAccounts state
          }
        })
        .catch(error => {
          console.error('Error fetching linked accounts:', error);
          setNoAccounts(true); // Set noAccounts to true in case of error
        });
    }
  }, [id, isAuthenticated, user]); // Run the effect whenever id, isAuthenticated, or user changes
  console.log(user)
  return (
    <div>
      {noAccounts ? (
        <>
          <NotFound />
          <CreateAccount />
        </>
      ) : (
        <div>
          <center><h2>Account Page</h2></center>
          <center style={{ marginTop: 100 }}>
            {linkedAccounts.map((account, index) => (
              <a href='http://localhost:3000/auth/outlook'>
              <div key={index}>
                <b>{account.id}</b>
                <p>{account.platform}</p>
              </div></a>
            ))}
          </center>
        </div>
      )}
    </div>
  );
}

export default Accounts;
