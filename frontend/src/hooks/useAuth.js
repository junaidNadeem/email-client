import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkAuthentication } from '../services/apiService';

const useAuth = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authenticate = async () => {
      try {
        const authStatus = await checkAuthentication();
        setIsAuthenticated(authStatus);
      } catch (error) {
        console.error('Error checking authentication status:', error);
        navigate('/');
      }
    };

    authenticate();
  }, [navigate]);

  const resetAuthStatus = () => {
    sessionStorage.setItem('isUserCreated', 'false');
    sessionStorage.setItem('isAccountCreated', 'false');
    setIsAuthenticated(false);
  };

  return { isAuthenticated, resetAuthStatus };
};

export default useAuth;
