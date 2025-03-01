import {create} from 'zustand';

interface Order {
  _id: string;
  orderId: string;
  status: string;
  totalPrice: number;
  items: {_id: string; item: {name: string; price: number}; count: number}[];
}

interface StoreState {
  storeStatus: 'open' | 'closed';
  deliveryServiceAvailable: boolean;
  userId: string | null;
  sessionExpiredMessage: string | null;
  orders: Order[];
  setStoreStatus: (status: 'open' | 'closed') => void;
  setDeliveryServiceAvailable: (available: boolean) => void;
  setUserId: (id: string | null) => void;
  setSessionExpiredMessage: (message: string | null) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updatedOrder: Order) => void;
  setOrders: (orders: Order[]) => void; // New: Set orders from fetch
}

export const useStore = create<StoreState>(set => ({
  storeStatus: 'open',
  deliveryServiceAvailable: false,
  userId: null,
  sessionExpiredMessage: null,
  orders: [],
  setStoreStatus: status => set({storeStatus: status}),
  setDeliveryServiceAvailable: available =>
    set({deliveryServiceAvailable: available}),
  setUserId: id => set({userId: id}),
  setSessionExpiredMessage: message => set({sessionExpiredMessage: message}),
  addOrder: order => set(state => ({orders: [...state.orders, order]})),
  updateOrder: (orderId, updatedOrder) =>
    set(state => ({
      orders: state.orders.map(o => (o._id === orderId ? updatedOrder : o)),
    })),
  setOrders: orders => set({orders}), // New: Replace orders array
}));
