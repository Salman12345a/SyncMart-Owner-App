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

export const useStore = create<StoreState>((set, get) => ({
  storeStatus: 'open',
  deliveryServiceAvailable: false,
  userId: null,
  sessionExpiredMessage: null,
  orders: [],
  deliveryPartners: [],
  branches: [],
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
  setOrders: orders => set({orders}),
  setDeliveryPartners: partners => set({deliveryPartners: partners}),
  addDeliveryPartner: partner =>
    set(state => ({deliveryPartners: [...state.deliveryPartners, partner]})),
  hasApprovedDeliveryPartner: () =>
    get().deliveryPartners.some(dp => dp.status === 'approved'),
  addBranch: branch =>
    set(state => ({
      branches: [
        ...state.branches.filter(b => b.id !== branch.id), // Remove if exists
        branch, // Add new/updated branch
      ],
    })),
  updateBranchStatus: (branchId, status) =>
    set(state => ({
      branches: state.branches.map(b =>
        b.id === branchId ? {...b, status} : b,
      ),
    })),
}));
