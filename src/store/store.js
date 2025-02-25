import create from 'zustand';

export const useStore = create(set => ({
  storeStatus: 'open',
  deliveryEnabled: false,
  orders: [],
  inventory: [],
  financials: {},
  setStoreStatus: status => set({storeStatus: status}),
  setDeliveryEnabled: enabled => set({deliveryEnabled: enabled}),
  setOrders: orders => set({orders}),
  setInventory: inventory => set({inventory}),
  setFinancials: financials => set({financials}),
}));
