import {create} from 'zustand';
import {storage} from '../utils/storage';

interface Order {
  _id: string;
  orderId: string;
  items: Array<{
    _id: string;
    item: {name: string; price: number};
    count: number;
  }>;
  totalPrice: number;
  status: string;
  deliveryServiceAvailable: boolean;
  modificationHistory: Array<{changes: string}>;
  customer: string;
}

interface DeliveryPartner {
  _id: string;
  status: string;
}

interface Branch {
  _id: string;
  name: string;
  status: string;
  phone: string;
  storeStatus: 'open' | 'closed';
  deliveryServiceAvailable: boolean;
  location: {type: 'Point'; coordinates: [number, number]};
  address: {street: string; area: string; city: string; pincode: string};
  branchEmail?: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  selfPickup: boolean;
  branchfrontImage: string;
  ownerIdProof: string;
  ownerPhoto: string;
  accessToken?: string;
}

interface RegistrationForm {
  step1Data?: {
    name: string;
    latitude: string;
    longitude: string;
    street: string;
    area: string;
    city: string;
    pincode: string;
    branchEmail?: string;
    openingTime: string;
    closingTime: string;
  };
  step2Data?: {
    ownerName: string;
    govId: string;
    deliveryServiceAvailable: boolean;
    selfPickup: boolean;
  };
  step3Data?: {
    branchfrontImage: {uri: string; type: string; name: string} | null;
    ownerIdProof: {uri: string; type: string; name: string} | null;
    ownerPhoto: {uri: string; type: string; name: string} | null;
  };
  step4Data?: {phone: string};
}

interface StoreState {
  storeStatus: 'open' | 'closed';
  deliveryServiceAvailable: boolean;
  userId: string | null;
  sessionExpiredMessage: string | null;
  orders: Order[];
  deliveryPartners: DeliveryPartner[];
  branch: Branch | null;
  registrationForm: RegistrationForm;
  setStoreStatus: (status: 'open' | 'closed') => void;
  setDeliveryServiceAvailable: (available: boolean) => void;
  setUserId: (id: string | null) => void;
  setSessionExpiredMessage: (message: string | null) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updatedOrder: Order) => void;
  setOrders: (orders: Order[]) => void;
  setDeliveryPartners: (partners: DeliveryPartner[]) => void;
  addDeliveryPartner: (partner: DeliveryPartner) => void;
  hasApprovedDeliveryPartner: () => boolean;
  setBranch: (branch: Branch | null) => void;
  setRegistrationFormStep: (step: keyof RegistrationForm, data: any) => void;
  clearRegistrationForm: () => void;
  initializeStore: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  storeStatus: 'open',
  deliveryServiceAvailable: false,
  userId: null,
  sessionExpiredMessage: null,
  orders: [],
  deliveryPartners: [],
  branch: null,
  registrationForm: {},

  setStoreStatus: status => {
    if (status !== 'open' && status !== 'closed') return;
    set({storeStatus: status});
  },

  setDeliveryServiceAvailable: available => {
    if (typeof available !== 'boolean') return;
    set({deliveryServiceAvailable: available});
  },

  setUserId: id => set({userId: id}),

  setSessionExpiredMessage: message => set({sessionExpiredMessage: message}),

  addOrder: order => set(state => ({orders: [...state.orders, order]})),

  updateOrder: (orderId, updatedOrder) =>
    set(state => ({
      orders: state.orders.map(o => (o._id === orderId ? updatedOrder : o)),
    })),

  setOrders: orders => set({orders}),

  setDeliveryPartners: partners => set({deliveryPartners: partners}),

  addDeliveryPartner: partner =>
    set(state => ({deliveryPartners: [...state.deliveryPartners, partner]})),

  hasApprovedDeliveryPartner: () =>
    get().deliveryPartners.some(dp => dp.status === 'approved'),

  setBranch: branch => {
    set(state => {
      const updatedBranch = branch
        ? {
            ...state.branch, // Preserve existing fields
            ...branch, // Update with new data
            _id: branch._id || state.branch?._id || '',
            phone: branch.phone || state.branch?.phone || '',
            accessToken: branch.accessToken || state.branch?.accessToken, // Explicitly preserve accessToken
          }
        : null;
      if (updatedBranch) {
        console.log(
          'setBranch received branch with accessToken:',
          branch?.accessToken,
        );
        console.log(
          'Persisting branch with accessToken:',
          updatedBranch.accessToken,
        );
        storage.set('branchData', JSON.stringify(updatedBranch));
        console.log('Persisted branch to storage:', updatedBranch);
      } else {
        storage.remove('branchData');
        console.log('Cleared branch data from storage');
      }
      return {
        branch: updatedBranch,
        userId: updatedBranch ? updatedBranch._id : null,
      };
    });
  },

  setRegistrationFormStep: (step, data) =>
    set(state => ({
      registrationForm: {...state.registrationForm, [step]: data},
    })),

  clearRegistrationForm: () => set({registrationForm: {}}),

  initializeStore: () => {
    const storedBranch = storage.getString('branchData');
    if (storedBranch) {
      try {
        const parsedBranch: Branch = JSON.parse(storedBranch);
        console.log(
          'Restoring branch with accessToken:',
          parsedBranch.accessToken,
        );
        set({
          branch: parsedBranch,
          userId: parsedBranch._id,
        });
        console.log('Restored branch from storage:', parsedBranch);
      } catch (error) {
        console.error('Failed to parse stored branch data:', error);
      }
    } else {
      console.log('No branch data found in storage');
    }
  },
}));

useStore.getState().initializeStore();
