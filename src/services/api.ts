import axios, {AxiosInstance} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {navigationRef} from '../../App';

interface DeliveryPartnerForm {
  name?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  licenseNumber: string;
  rcNumber: string;
  phone: number;
  licenseImage: {uri: string; type: string; name: string};
  rcImage: {uri: string; type: string; name: string};
  aadhaarFront: {uri: string; type: string; name: string};
  aadhaarBack: {uri: string; type: string; name: string};
  deliveryPartnerPhoto: {uri: string; type: string; name: string};
}

interface BranchRegistrationData {
  branchName: string;
  branchLocation: string;
  branchAddress: string;
  branchEmail?: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govid: string;
  homeDelivery: string;
  selfPickup: string;
  branchfrontImage: {uri: string; type: string; name: string};
  ownerIdProof: {uri: string; type: string; name: string};
  ownerPhoto: {uri: string; type: string; name: string};
  phone: string;
}

const api: AxiosInstance = axios.create({
  baseURL: 'http://10.0.2.2:3000/api',
  timeout: 10000,
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
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      config: error.config,
      response: error.response?.data,
    });
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
  const response = await api.get('/delivery-partner', {
    params: branchId ? {branchId} : undefined,
  });
  return response.data;
};

export const collectCash = async (orderId: string) => {
  const response = await api.patch(`/orders/${orderId}/collect-cash`);
  return response.data;
};

export const registerDeliveryPartner = async (data: DeliveryPartnerForm) => {
  const formData = new FormData();
  formData.append('name', data.name || '');
  formData.append('age', data.age.toString());
  formData.append('gender', data.gender);
  formData.append('licenseNumber', data.licenseNumber);
  formData.append('rcNumber', data.rcNumber);
  formData.append('phone', data.phone.toString());
  formData.append('licenseImage', data.licenseImage as any);
  formData.append('rcImage', data.rcImage as any);
  formData.append('aadhaarFront', data.aadhaarFront as any);
  formData.append('aadhaarBack', data.aadhaarBack as any);
  formData.append('deliveryPartnerPhoto', data.deliveryPartnerPhoto as any);

  const response = await api.post('/delivery-partner/register', formData, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
  return response.data;
};

export const modifyDeliveryPartner = async (
  id: string,
  data: DeliveryPartnerForm,
) => {
  const formData = new FormData();
  formData.append('name', data.name || '');
  formData.append('age', data.age.toString());
  formData.append('gender', data.gender);
  formData.append('licenseNumber', data.licenseNumber);
  formData.append('rcNumber', data.rcNumber);
  formData.append('phone', data.phone.toString());
  formData.append('licenseImage', data.licenseImage as any);
  formData.append('rcImage', data.rcImage as any);
  formData.append('aadhaarFront', data.aadhaarFront as any);
  formData.append('aadhaarBack', data.aadhaarBack as any);
  formData.append('deliveryPartnerPhoto', data.deliveryPartnerPhoto as any);

  const response = await api.patch(`/delivery-partner/${id}`, formData, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
  return response.data;
};

export const registerBranch = async (data: FormData) => {
  try {
    console.log('Register Branch FormData: (Multipart data prepared)', data);
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch('http://10.0.2.2:3000/api/register/branch', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
      },
      body: data,
    });
    const result = await response.json();
    console.log('Register Branch Response:', result);
    if (!response.ok) {
      throw new Error(
        `Request failed with status ${response.status}: ${JSON.stringify(
          result,
        )}`,
      );
    }
    return result;
  } catch (error) {
    console.error('Register Branch Error:', error.message, error);
    throw error;
  }
};

export default api;
