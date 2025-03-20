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
    console.log('Request Authorization Header:', `Bearer ${token}`);
  }
  console.log('Request Config:', config);
  return config;
});

api.interceptors.response.use(
  response => {
    console.log('Response Data:', response.data);
    return response;
  },
  async error => {
    console.error('API Error:', error.response?.data || error.message);
    if (
      error.response?.status === 401 &&
      error.config.url !== '/auth/branch/login'
    ) {
      console.log(
        'Unauthorized: Clearing token and redirecting to Authentication',
      );
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
    console.log('Fetching delivery partners for branchId:', branchId);
    const response = await api.get('/delivery-partner', {
      params: branchId ? {branchId} : undefined,
    });
    console.log('Fetch Delivery Partners Success:', response.data);
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
    console.log('Collecting cash for orderId:', orderId);
    const response = await api.patch(`/orders/${orderId}/collect-cash`);
    console.log('Collect Cash Success:', response.data);
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
  pancard: any;
}) => {
  try {
    console.log('Registering delivery partner with data:', data);
    const formData = new FormData();
    formData.append('name', data.name || '');
    formData.append('age', data.age.toString());
    formData.append('gender', data.gender);
    formData.append('licenseNumber', data.licenseNumber);
    formData.append('rcNumber', data.rcNumber);
    formData.append('phone', data.phone.toString());
    formData.append('licenseImage', data.licenseImage);
    formData.append('rcImage', data.rcImage);
    formData.append('pancard', data.pancard);

    console.log('Delivery Partner FormData prepared:', formData);
    const response = await api.post('/delivery-partner/register', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
    console.log('Register Delivery Partner Success:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Register Delivery Partner Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const registerBranch = async (data: {
  name: string;
  location: {type: 'Point'; coordinates: [number, number]};
  address: {street: string; area: string; city: string; pincode: string};
  branchEmail?: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  phone: string;
  deliveryServiceAvailable: boolean;
  selfPickup: boolean;
  branchfrontImage: {uri: string; type: string; name: string};
  ownerIdProof: {uri: string; type: string; name: string};
  ownerPhoto: {uri: string; type: string; name: string};
}) => {
  try {
    console.log('Registering branch with data:', JSON.stringify(data, null, 2));

    const formData = new FormData();

    formData.append('branchName', data.name);
    formData.append(
      'branchLocation',
      JSON.stringify({
        latitude: data.location.coordinates[1],
        longitude: data.location.coordinates[0],
      }),
    );
    formData.append('branchAddress', JSON.stringify(data.address));
    formData.append('branchEmail', data.branchEmail || '');
    formData.append('openingTime', data.openingTime);
    formData.append('closingTime', data.closingTime);
    formData.append('ownerName', data.ownerName);
    formData.append('govId', data.govId);
    formData.append('phone', data.phone);
    formData.append('homeDelivery', data.deliveryServiceAvailable.toString());
    formData.append('selfPickup', data.selfPickup.toString());

    formData.append('branchfrontImage', {
      uri: data.branchfrontImage.uri,
      type: data.branchfrontImage.type,
      name: data.branchfrontImage.name,
    });
    formData.append('ownerIdProof', {
      uri: data.ownerIdProof.uri,
      type: data.ownerIdProof.type,
      name: data.ownerIdProof.name,
    });
    formData.append('ownerPhoto', {
      uri: data.ownerPhoto.uri,
      type: data.ownerPhoto.type,
      name: data.ownerPhoto.name,
    });

    console.log('FormData prepared for branch registration');
    const response = await api.post('/register/branch', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });

    console.log('Register Branch Success:', response.data);

    if (response.data.accessToken) {
      await AsyncStorage.setItem('accessToken', response.data.accessToken);
      console.log('Access Token stored:', response.data.accessToken);
    }

    return response.data;
  } catch (error) {
    console.error(
      'Register Branch Error:',
      error.response?.data || error.message,
    );
    throw error.response?.data || error;
  }
};

export const fetchBranchStatus = async (branchId: string) => {
  try {
    console.log('Fetching branch status for branchId:', branchId);
    const response = await api.get(`/branch/status/${branchId}`); // Updated to new endpoint
    console.log('Fetch Branch Status Success:', response.data);
    return response.data; // Returns { branchId, phone, name, status }
  } catch (error) {
    console.error(
      'Fetch Branch Status Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export default api;
