import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Adjust to your Fastify backend URL
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken'); // Use AsyncStorage in React Native
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
