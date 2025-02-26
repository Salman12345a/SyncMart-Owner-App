import {create} from 'zustand';

interface StoreState {
  storeStatus: 'open' | 'closed';
  deliveryServiceAvailable: boolean;
  userId: string | null; // Add userId to track the logged-in branch
  setStoreStatus: (status: 'open' | 'closed') => void;
  setDeliveryServiceAvailable: (available: boolean) => void;
  setUserId: (id: string | null) => void; // Setter for userId
}

export const useStore = create<StoreState>(set => ({
  storeStatus: 'open',
  deliveryServiceAvailable: false,
  userId: null, // Initially null until login
  setStoreStatus: status => set({storeStatus: status}),
  setDeliveryServiceAvailable: available =>
    set({deliveryServiceAvailable: available}),
  setUserId: id => set({userId: id}),
}));
