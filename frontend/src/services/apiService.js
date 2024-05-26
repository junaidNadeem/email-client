import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

export const checkAuthentication = async () => {
  const response = await api.get('/isAuthenticated');
  return response.data.isAuthenticated;
};

export const fetchEmails = async () => {
  const response = await api.get('/emails');
  return response.data.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
};

export const createUser = async (user) => {
  const response = await api.post('/createuser', null, {
    headers: {
      id: user.sub,
      email: user.email,
      name: user.nickname,
      number: user.phone_number || 'null',
    },
  });
  return response.status === 201;
};

export const createAccount = async (userId) => {
  const response = await api.get('/createaccount', {
    headers: { user_id: userId },
  });
  return response.status === 201;
};
