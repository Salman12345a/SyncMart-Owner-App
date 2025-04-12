import {create} from 'zustand';
import {MMKV} from 'react-native-mmkv';

export interface Order {
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
}

interface Branch {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  phone: string;
  address: {street: string; area: string; city: string; pincode: string};
  location: {type: string; coordinates: [number, number]};
  branchEmail?: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  deliveryServiceAvailable: boolean;
  selfPickup: boolean;
  branchfrontImage: string;
  ownerIdProof: string;
  ownerPhoto: string;
}

interface StoreState {
  storeStatus: 'open' | 'closed';
  deliveryServiceAvailable: boolean;
  userId: string | null;
  sessionExpiredMessage: string | null;
  orders: Order[];
  deliveryPartners: DeliveryPartner[];
  branches: Branch[];
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
  addBranch: (branch: Branch) => void;
  updateBranchStatus: (
    branchId: string,
    status: 'pending' | 'approved' | 'rejected',
  ) => void;
}

const storage = new MMKV();
const STORAGE_KEY = 'deliveryServiceAvailable';

// Load initial value from MMKV (synchronous)
const initialDeliveryServiceAvailable =
  storage.getBoolean(STORAGE_KEY) !== undefined
    ? storage.getBoolean(STORAGE_KEY)
    : false;

export const useStore = create<StoreState>((set, get) => ({
  storeStatus: 'open',
  deliveryServiceAvailable: initialDeliveryServiceAvailable || false, // Ensure it's a boolean
  userId: null,
  sessionExpiredMessage: null,
  orders: [],
  deliveryPartners: [],
  branches: [],
  setStoreStatus: status => set({storeStatus: status}),
  setDeliveryServiceAvailable: available => {
    set({deliveryServiceAvailable: available});
    storage.set(STORAGE_KEY, available); // Persist synchronously
  },
  setUserId: id => set({userId: id}),
  setSessionExpiredMessage: message => set({sessionExpiredMessage: message}),
  addOrder: order =>
    set(state => {
      // Avoid adding duplicate orders (with same _id)
      if (!order._id) {
        return {orders: [...state.orders, order]};
      }

      // Check if order with this _id already exists
      const existingOrderIndex = state.orders.findIndex(
        o => o._id === order._id,
      );
      if (existingOrderIndex >= 0) {
        // Order already exists, don't add it
        console.log(
          'Order already exists in store, not adding duplicate:',
          order._id,
          'orderId:',
          order.orderId,
        );
        return state;
      }

      // New order, add it to state
      console.log(
        'Adding NEW order to store:',
        order._id,
        'orderId:',
        order.orderId,
      );
      return {orders: [...state.orders, order]};
    }),
  updateOrder: (orderId, updatedOrder) =>
    set(state => ({
      orders: state.orders.map(o => (o._id === orderId ? updatedOrder : o)),
    })),
  setOrders: orders =>
    set(state => {
      // First, filter out duplicates from the new orders array itself
      const uniqueNewOrders = orders.filter(
        (order, index, self) =>
          index === self.findIndex(o => o._id === order._id),
      );

      // Check for duplicate orders and log them
      if (uniqueNewOrders.length < orders.length) {
        console.log(
          'Removed',
          orders.length - uniqueNewOrders.length,
          'internal duplicate orders',
        );
      }

      // Handle the case where we're doing a full refresh vs. adding new orders
      if (state.orders.length === 0) {
        // First load - just set the orders directly
        console.log('Initial load of', uniqueNewOrders.length, 'orders');
        return {orders: uniqueNewOrders};
      } else {
        // We already have orders - merge them carefully to avoid duplicates
        const currentOrderIds = new Set(state.orders.map(o => o._id));
        const updatedOrders = [...state.orders];

        // Count new orders added
        let newOrdersAdded = 0;

        // Add only orders that don't exist in current state
        uniqueNewOrders.forEach(order => {
          if (!currentOrderIds.has(order._id)) {
            updatedOrders.push(order);
            newOrdersAdded++;
            console.log(
              'Adding order via setOrders:',
              order._id,
              'orderId:',
              order.orderId,
            );
          }
        });

        if (newOrdersAdded > 0) {
          console.log('Added', newOrdersAdded, 'new orders from API');
        }

        return {orders: updatedOrders};
      }
    }),
  setDeliveryPartners: partners => set({deliveryPartners: partners}),
  addDeliveryPartner: partner =>
    set(state => ({deliveryPartners: [...state.deliveryPartners, partner]})),
  hasApprovedDeliveryPartner: () =>
    get().deliveryPartners.some(dp => dp.status === 'approved'),
  addBranch: branch =>
    set(state => ({
      branches: [...state.branches.filter(b => b.id !== branch.id), branch],
    })),
  updateBranchStatus: (branchId, status) =>
    set(state => ({
      branches: state.branches.map(b =>
        b.id === branchId ? {...b, status} : b,
      ),
    })),
}));
