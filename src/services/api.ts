import axios, {AxiosInstance} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {navigationRef} from '../../App';

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
      error.config.url !== '/auth/branch/login'
    ) {
      await AsyncStorage.removeItem('accessToken');
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{name: 'Authentication'}],
        });
      }
    }
    return Promise.reject(error);
  },
);

export const fetchDeliveryPartners = async (branchId?: string) => {
  try {
    const response = await api.get('/delivery-partners', {
      params: branchId ? {branchId} : undefined,
    });
    return response.data;
  } catch (error) {
    console.error(
      'Fetch Delivery Partners Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

// New method for Collect Cash
export const collectCash = async (orderId: string) => {
  try {
    const response = await api.patch(`/orders/${orderId}/collect-cash`);
    return response.data;
  } catch (error) {
    console.error('Collect Cash Error:', error.response?.data || error.message);
    throw error;
  }
};

export default api;
