import axios, {AxiosInstance, AxiosError} from 'axios';
import {storage} from '../utils/storage'; // Replace AsyncStorage with MMKV
import {navigationRef} from '../../App';

const api: AxiosInstance = axios.create({
  baseURL: 'http://10.0.2.2:3000/api',
});

api.interceptors.request.use(async config => {
  const token = storage.getString('accessToken'); // Use MMKV
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
      storage.removeItem('accessToken'); // Use MMKV
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
  licenseImage: {uri: string; type: string; name: string};
  rcImage: {uri: string; type: string; name: string};
  deliveryPartnerPhoto: {uri: string; type: string; name: string};
  aadhaarFront: {uri: string; type: string; name: string};
  aadhaarBack: {uri: string; type: string; name: string};
  pancard?: {uri: string; type: string; name: string};
}) => {
  try {
    console.log('Registering delivery partner with data:', data);
    const formData = new FormData();
    formData.append('name', data.name || '');
    const ageNum = isNaN(data.age) ? 0 : data.age; // Default to 0 or validate
    formData.append('age', ageNum.toString());
    formData.append('gender', data.gender);
    formData.append('licenseNumber', data.licenseNumber);
    formData.append('rcNumber', data.rcNumber);
    formData.append('phone', data.phone.toString());
    formData.append('licenseImage', data.licenseImage);
    formData.append('rcImage', data.rcImage);
    formData.append('deliveryPartnerPhoto', data.deliveryPartnerPhoto);
    formData.append('aadhaarFront', data.aadhaarFront);
    formData.append('aadhaarBack', data.aadhaarBack);
    if (data.pancard) formData.append('pancard', data.pancard);

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
      name: data.branchfrontImage.name || 'branchfrontImage.jpg',
    } as any);
    formData.append('ownerIdProof', {
      uri: data.ownerIdProof.uri,
      type: data.ownerIdProof.type,
      name: data.ownerIdProof.name || 'ownerIdProof.jpg',
    } as any);
    formData.append('ownerPhoto', {
      uri: data.ownerPhoto.uri,
      type: data.ownerPhoto.type,
      name: data.ownerPhoto.name || 'ownerPhoto.jpg',
    } as any);

    console.log('FormData prepared for branch registration');
    const response = await api.post('/register/branch', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });

    console.log('Register Branch Success:', response.data);

    if (response.data.accessToken) {
      storage.set('accessToken', response.data.accessToken); // Use MMKV
      console.log('Access Token stored:', response.data.accessToken);
    } else {
      console.warn('No accessToken returned in response');
    }
    storage.set('branchPhone', data.phone); // Use MMKV
    console.log('Branch Phone stored:', data.phone);

    if (response.data.branch?._id) {
      storage.set('userId', response.data.branch._id); // Use MMKV
      console.log('UserId (branchId) stored:', response.data.branch._id);
    } else {
      console.warn('No branch._id returned in response');
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
    const response = await api.get(`/branch/status/${branchId}`);
    console.log('Fetch Branch Status Success:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Fetch Branch Status Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const resubmitBranch = async (
  branchId: string,
  data: {
    name: string;
    branchLocation: string;
    branchAddress: string;
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
  },
) => {
  try {
    console.log(
      'Resubmitting branch with data:',
      JSON.stringify(data, null, 2),
    );

    const location = JSON.parse(data.branchLocation);
    const address = JSON.parse(data.branchAddress);

    const requestBody = {
      branchName: data.name,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      address: address,
      branchEmail: data.branchEmail || '',
      openingTime: data.openingTime,
      closingTime: data.closingTime,
      ownerName: data.ownerName,
      govId: data.govId,
      phone: data.phone,
      homeDelivery: data.deliveryServiceAvailable,
      selfPickup: data.selfPickup,
      branchfrontImage: data.branchfrontImage.uri,
      ownerIdProof: data.ownerIdProof.uri,
      ownerPhoto: data.ownerPhoto.uri,
    };

    const token = storage.getString('accessToken'); // Use MMKV
    const url = `http://10.0.2.2:3000/api/modify/branch/${branchId}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw new Error(responseData.error || 'Failed to resubmit branch');
    }

    console.log('Resubmit Branch Success:', responseData);
    return responseData;
  } catch (error) {
    console.error('Resubmit Branch Error:', error.message || error);
    throw error;
  }
};

export const modifyDeliveryPartner = async (
  id: string,
  data: {
    name?: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    licenseNumber: string;
    rcNumber: string;
    phone: number;
    licenseImage: {uri: string; type: string; name: string};
    rcImage: {uri: string; type: string; name: string};
    deliveryPartnerPhoto: {uri: string; type: string; name: string};
    aadhaarFront: {uri: string; type: string; name: string};
    aadhaarBack: {uri: string; type: string; name: string};
  },
) => {
  try {
    console.log('Modifying delivery partner with id:', id, 'data:', data);

    const formData = new FormData();

    if (data.name) formData.append('name', data.name);
    const ageNum = isNaN(data.age) ? 0 : data.age;
    formData.append('age', ageNum.toString());
    formData.append('gender', data.gender);
    formData.append('licenseNumber', data.licenseNumber);
    formData.append('rcNumber', data.rcNumber);
    formData.append('phone', data.phone.toString());

    formData.append('licenseImage', data.licenseImage);
    formData.append('rcImage', data.rcImage);
    formData.append('deliveryPartnerPhoto', data.deliveryPartnerPhoto);
    formData.append('aadhaarFront', data.aadhaarFront);
    formData.append('aadhaarBack', data.aadhaarBack);

    console.log('Modify Delivery Partner FormData prepared:', formData);

    const response = await api.patch(`/delivery-partner/${id}`, formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });

    console.log('Modify Delivery Partner Success:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Modify Delivery Partner Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const fetchOrderDetails = async (orderId: string) => {
  try {
    console.log('Fetching order details for orderId:', orderId);
    const response = await api.get(`/orders/${orderId}`);
    console.log('Fetch Order Details Success:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Fetch Order Details Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export default api;
