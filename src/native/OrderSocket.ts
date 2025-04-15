import {NativeEventEmitter, NativeModules} from 'react-native';

const {OrderSocketModule} = NativeModules;

interface OrderSocketInterface {
  connect(branchId: string, token: string): Promise<void>;
  disconnect(): Promise<void>;
  getRecentOrders(branchId: string): Promise<any[]>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export const OrderSocket: OrderSocketInterface = OrderSocketModule;

export const OrderSocketEventEmitter = new NativeEventEmitter(
  OrderSocketModule,
);

export const OrderSocketEvents = {
  NEW_ORDER: 'newOrder',
  ORDER_UPDATE: 'orderUpdate',
} as const;
