import {create} from 'zustand';

interface StoreState {
  storeStatus: 'open' | 'closed';
  deliveryServiceAvailable: boolean;
  userId: string | null;
  setStoreStatus: (status: 'open' | 'closed') => void;
  setDeliveryServiceAvailable: (available: boolean) => void;
  setUserId: (id: string | null) => void;
}

export const useStore = create<StoreState>(set => ({
  storeStatus: 'open',
  deliveryServiceAvailable: false,
  userId: null,
  setStoreStatus: status => set({storeStatus: status}),
  setDeliveryServiceAvailable: available =>
    set({deliveryServiceAvailable: available}),
  setUserId: id => set({userId: id}),
}));
