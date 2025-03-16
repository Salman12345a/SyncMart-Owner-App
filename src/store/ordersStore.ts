import {create} from 'zustand';

interface Order {
  _id: string;
  orderId: string;
  status: string;
  totalPrice: number;
  items: {_id: string; item: {name: string; price: number}; count: number}[];
  deliveryServiceAvailable?: boolean;
  modificationHistory?: {changes: string[]}[];
  customer?: string;
}

interface DeliveryPartner {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  photo: string;
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
  setBranch: branch => set({branch}),
  setRegistrationFormStep: (step, data) =>
    set(state => ({
      registrationForm: {...state.registrationForm, [step]: data},
    })),
  clearRegistrationForm: () => set({registrationForm: {}}),
}));
