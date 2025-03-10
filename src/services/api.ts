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
    const response = await api.get('/delivery-partner', {
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

export const collectCash = async (orderId: string) => {
  try {
    const response = await api.patch(`/orders/${orderId}/collect-cash`);
    return response.data;
  } catch (error) {
    console.error('Collect Cash Error:', error.response?.data || error.message);
    throw error;
  }
};

export const registerDeliveryPartner = async (data: {
  name?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  licenseNumber: string;
  rcNumber: string;
  phone: number;
  licenseImage: any;
  rcImage: any;
  aadhaarFront: any;
  aadhaarBack: any;
  deliveryPartnerPhoto: any;
}) => {
  try {
    const formData = new FormData();
    formData.append('name', data.name || '');
    formData.append('age', data.age.toString());
    formData.append('gender', data.gender);
    formData.append('licenseNumber', data.licenseNumber);
    formData.append('rcNumber', data.rcNumber);
    formData.append('phone', data.phone.toString());
    formData.append('licenseImage', data.licenseImage);
    formData.append('rcImage', data.rcImage);
    formData.append('aadhaarFront', data.aadhaarFront);
    formData.append('aadhaarBack', data.aadhaarBack);
    formData.append('deliveryPartnerPhoto', data.deliveryPartnerPhoto);

    const response = await api.post('/delivery-partner/register', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
    return response.data; // { message: "Delivery partner registered", id: "<id>" }
  } catch (error) {
    console.error(
      'Register Delivery Partner Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export default api;
