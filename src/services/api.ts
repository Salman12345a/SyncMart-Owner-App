import axios, {AxiosInstance, AxiosError} from 'axios';
import {storage} from '../utils/storage'; // MMKV storage
import {navigationRef} from '../../App';
import {config} from '../config'; // Import config for BASE_URL

// Response types for wallet APIs
interface WalletBalanceResponse {
  balance: number;
}

interface WalletTransactionResponse {
  transactions: {
    amount: number;
    type: 'platform_charge' | 'payment';
    timestamp: string;
  }[];
}

interface WalletPaymentsResponse {
  payments: {
    amount: number;
    type: 'payment';
    timestamp: string;
  }[];
}

interface WalletPaymentResponse {
  message: string;
  newBalance: number;
}

// Store Status Response Types
interface StoreStatusResponse {
  message: string;
  storeStatus: 'open' | 'closed';
  deliveryServiceAvailable: boolean;
  balance: number;
  reason?: string;
}

const api: AxiosInstance = axios.create({
  baseURL: config.BASE_URL, // Use BASE_URL from config
});

api.interceptors.request.use(async config => {
  const token = storage.getString('accessToken'); // Use MMKV
  if (token) {
    // Always include token in Authorization header when available
    config.headers.Authorization = `Bearer ${token}`;
    console.log(
      'Request Authorization Header:',
      `Bearer ${token.substring(0, 15)}...`,
    );
  } else {
    console.log('No auth token available for request:', config.url);
  }

  // Only log non-sensitive parts of the config
  const safeConfig = {
    url: config.url,
    method: config.method,
    baseURL: config.baseURL,
    params: config.params,
    hasAuth: !!token,
  };
  console.log('Request Config:', safeConfig);

  return config;
});

api.interceptors.response.use(
  response => {
    if (response.config.url !== '/orders/') {
      // Avoid logging large order responses
      console.log(
        'Response Data for',
        response.config.url,
        ':',
        typeof response.data === 'object'
          ? Array.isArray(response.data)
            ? `Array with ${response.data.length} items`
            : Object.keys(response.data)
          : response.data,
      );
    } else {
      console.log('Orders fetched successfully');
    }
    return response;
  },
  async (error: AxiosError) => {
    console.error(
      'API Error:',
      error.response?.status,
      error.response?.statusText,
      error.response?.data || error.message,
    );

    if (
      error.response?.status === 401 &&
      error.config?.url !== '/auth/branch/login'
    ) {
      console.log(
        'Unauthorized: Clearing token and redirecting to Authentication',
      );
      storage.delete('accessToken'); // Use MMKV delete
      storage.delete('userId'); // Clear userId for consistency
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

// Wallet API Functions
export const fetchWalletBalance = async (): Promise<WalletBalanceResponse> => {
  try {
    const branchId = storage.getString('userId');
    if (!branchId) throw new Error('Branch ID not found');
    const response = await api.get(`/wallet/balance/${branchId}`);
    console.log('Fetch Wallet Balance Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Fetch Wallet Balance Error:',
      error.response?.data || error.message,
    );
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to fetch wallet balance';
    throw new Error(message);
  }
};

export const fetchWalletTransactions =
  async (): Promise<WalletTransactionResponse> => {
    try {
      const branchId = storage.getString('userId');
      if (!branchId) throw new Error('Branch ID not found');
      const response = await api.get(`/wallet/transactions/${branchId}`);
      console.log('Fetch Wallet Transactions Success:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        'Fetch Wallet Transactions Error:',
        error.response?.data || error.message,
      );
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch wallet transactions';
      throw new Error(message);
    }
  };

export const fetchWalletPayments =
  async (): Promise<WalletPaymentsResponse> => {
    try {
      const branchId = storage.getString('userId');
      if (!branchId) throw new Error('Branch ID not found');
      const response = await api.get(`/wallet/payments/${branchId}`);
      console.log('Fetch Wallet Payments Success:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        'Fetch Wallet Payments Error:',
        error.response?.data || error.message,
      );
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch wallet payments';
      throw new Error(message);
    }
  };

export const makeWalletPayment = async (
  amount: number,
): Promise<WalletPaymentResponse> => {
  try {
    const branchId = storage.getString('userId');
    if (!branchId) throw new Error('Branch ID not found');
    const response = await api.post(`/wallet/payments/${branchId}`, {amount});
    console.log('Make Wallet Payment Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Make Wallet Payment Error:',
      error.response?.data || error.message,
    );
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to submit payment';
    throw new Error(message);
  }
};

// Non-Wallet Functions (Unchanged except resubmitBranch)
export const fetchDeliveryPartners = async (branchId?: string) => {
  try {
    console.log('Fetching delivery partners for branchId:', branchId);
    const response = await api.get('/delivery-partner', {
      params: branchId ? {branchId} : undefined,
    });
    console.log('Fetch Delivery Partners Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Fetch Delivery Partners Error:',
      error.response?.data || error.message,
    );
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
    if (data.pancard) formData.append('pancard', data.pancard);

    console.log('Delivery Partner FormData prepared:', formData);
    const response = await api.post('/delivery-partner/register', formData, {
      headers: {'Content-Type': 'multipart/form-data'},
    });
    console.log('Register Delivery Partner Success:', response.data);
    return response.data;
  } catch (error: any) {
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
      storage.set('accessToken', response.data.accessToken);
      console.log('Access Token stored:', response.data.accessToken);
    } else {
      console.warn('No accessToken returned in response');
    }
    storage.set('branchPhone', data.phone);
    console.log('Branch Phone stored:', data.phone);

    if (response.data.branch?._id) {
      storage.set('userId', response.data.branch._id);
      console.log('UserId (branchId) stored:', response.data.branch._id);
    } else {
      console.warn('No branch._id returned in response');
    }

    return response.data;
  } catch (error: any) {
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
  } catch (error: any) {
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

    const response = await api.patch(`/modify/branch/${branchId}`, requestBody);

    console.log('Resubmit Branch Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Resubmit Branch Error:',
      error.response?.data || error.message,
    );
    throw error.response?.data || error;
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
  } catch (error: any) {
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
  } catch (error: any) {
    console.error(
      'Fetch Order Details Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const validateToken = async () => {
  try {
    const token = storage.getString('accessToken');
    if (!token) {
      return false;
    }

    // Make a simple request to test the token
    const response = await api.get('/syncmarts/status');
    return true;
  } catch (error: any) {
    console.log('Token validation failed:', error);
    return false;
  }
};

export const login = async (phone: string) => {
  try {
    const response = await api.post('/auth/branch/login', {
      phone: phone.trim(),
    });
    return {
      token: response.data.accessToken,
      branch: response.data.branch,
    };
  } catch (error: any) {
    throw error;
  }
};

// Store Status Functions
export const getStoreStatus = async (): Promise<StoreStatusResponse> => {
  try {
    const branchId = storage.getString('userId');
    if (!branchId) throw new Error('Branch ID not found');
    const response = await api.get('/syncmarts/status');
    console.log('Get Store Status Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Get Store Status Error:',
      error.response?.data || error.message,
    );
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to get store status';
    throw new Error(message);
  }
};

export const updateStoreStatus = async (
  newStatus: 'open' | 'closed',
): Promise<StoreStatusResponse> => {
  try {
    const branchId = storage.getString('userId');
    if (!branchId) throw new Error('Branch ID not found');
    const response = await api.post('/syncmarts/status', {
      storeStatus: newStatus,
    });
    console.log('Update Store Status Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Update Store Status Error:',
      error.response?.data || error.message,
    );
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to update store status';
    throw new Error(message);
  }
};

// Branch Registration with OTP Verification

// Step 1: Initialize branch registration
export const initiateBranchRegistration = async (data: {
  branchName: string;
  branchLocation: string;
  branchAddress: string;
  branchEmail?: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  phone: string;
  homeDelivery: string;
  selfPickup: string;
  branchfrontImage?: {uri: string; type: string; name: string};
  ownerIdProof?: {uri: string; type: string; name: string};
  ownerPhoto?: {uri: string; type: string; name: string};
}) => {
  try {
    console.log(
      'Initiating branch registration with data:',
      JSON.stringify(data, null, 2),
    );

    // Ensure phone number has country code
    let phoneNumber = data.phone;
    if (!phoneNumber.startsWith('+')) {
      console.warn('Phone number does not start with +, adding default +91');
      phoneNumber = '+91' + phoneNumber;
    }

    // Create FormData object for multipart/form-data submission
    const formData = new FormData();

    // Add all text fields
    formData.append('branchName', data.branchName);
    formData.append('branchLocation', data.branchLocation);
    formData.append('branchAddress', data.branchAddress);
    formData.append('branchEmail', data.branchEmail || '');
    formData.append('openingTime', data.openingTime);
    formData.append('closingTime', data.closingTime);
    formData.append('ownerName', data.ownerName);
    formData.append('govId', data.govId);
    formData.append('phone', phoneNumber);
    formData.append('homeDelivery', data.homeDelivery);
    formData.append('selfPickup', data.selfPickup);

    // Add file fields if available
    if (data.branchfrontImage && data.branchfrontImage.uri) {
      formData.append('branchfrontImage', {
        uri: data.branchfrontImage.uri,
        type: data.branchfrontImage.type || 'image/jpeg',
        name: data.branchfrontImage.name || 'branchfrontImage.jpg',
      } as any);
    }

    if (data.ownerIdProof && data.ownerIdProof.uri) {
      formData.append('ownerIdProof', {
        uri: data.ownerIdProof.uri,
        type: data.ownerIdProof.type || 'image/jpeg',
        name: data.ownerIdProof.name || 'ownerIdProof.jpg',
      } as any);
    }

    if (data.ownerPhoto && data.ownerPhoto.uri) {
      formData.append('ownerPhoto', {
        uri: data.ownerPhoto.uri,
        type: data.ownerPhoto.type || 'image/jpeg',
        name: data.ownerPhoto.name || 'ownerPhoto.jpg',
      } as any);
    }

    console.log('Sending branch registration with FormData');

    // Use FormData with the appropriate content-type header
    const response = await api.post('/register/branch/initiate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Branch Registration Initiation Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Branch Registration Initiation Error:',
      error.response?.data || error.message,
    );
    throw error.response?.data || error;
  }
};

// Step 1 (parallel): Send OTP to phone
export const sendOTP = async (phoneNumber: string) => {
  try {
    console.log('Sending OTP to phone:', phoneNumber);
    // Ensure phone number has country code
    if (!phoneNumber.startsWith('+')) {
      console.warn('Phone number does not start with +, adding default +91');
      phoneNumber = '+91' + phoneNumber;
    }
    const response = await api.post('/auth/branch/send-otp', {phoneNumber});
    console.log('Send OTP Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Send OTP Error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// Step 2: Verify OTP
export const verifyOTP = async (phoneNumber: string, otp: string) => {
  try {
    console.log('Verifying OTP for phone:', phoneNumber);
    // Ensure phone number has country code
    if (!phoneNumber.startsWith('+')) {
      console.warn('Phone number does not start with +, adding default +91');
      phoneNumber = '+91' + phoneNumber;
    }
    const response = await api.post('/auth/branch/verify-otp', {
      phoneNumber,
      otp,
    });
    console.log('Verify OTP Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Verify OTP Error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};

// Step 3: Complete branch registration
export const completeBranchRegistration = async (phoneNumber: string) => {
  try {
    console.log('Completing branch registration for phone:', phoneNumber);
    // Ensure phone number has country code
    if (!phoneNumber.startsWith('+')) {
      console.warn('Phone number does not start with +, adding default +91');
      phoneNumber = '+91' + phoneNumber;
    }
    const response = await api.post('/register/branch/complete', {
      phone: phoneNumber,
    });
    console.log('Complete Registration Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error(
      'Complete Registration Error:',
      error.response?.data || error.message,
    );
    throw error.response?.data || error;
  }
};

export default api;
