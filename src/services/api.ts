// services/api.ts
import axios, {AxiosInstance} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {navigationRef} from '../../App'; // Adjust path to App.tsx

const api: AxiosInstance = axios.create({
  baseURL: 'http://10.0.2.2:3000/api',
});

api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    console.error('API Error:', error.response?.data || error.message);
    if (
      error.response?.status === 401 &&
      error.config.url !== '/auth/branch/login' // Avoid loop on login failure
    ) {
      await AsyncStorage.removeItem('accessToken');
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{name: 'Authentication'}], // Updated to match AppNavigator
        });
      }
    }
    return Promise.reject(error);
  },
);

export default api;
