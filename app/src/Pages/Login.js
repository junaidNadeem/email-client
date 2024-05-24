import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const { loginWithRedirect, isAuthenticated, user, logout } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {

    if (isAuthenticated && user) {

      navigate(`/MainPage/`);
    }
  }, [isAuthenticated, user, navigate]);

  if (isAuthenticated) {
    return (
      <div>
        <h2>Welcome, {user.name}</h2>
        <img src={user.picture} alt={user.name} />
        <p>{user.email}</p>
        <button onClick={() => logout({ returnTo: window.location.origin })}>Log Out</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Please log in</h2>
      <button onClick={() => loginWithRedirect()}>Log In</button>
    </div>
  );
}

export default Login;
