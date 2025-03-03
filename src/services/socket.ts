import {io, Socket} from 'socket.io-client';
import {useStore} from '../store/ordersStore';

class SocketService {
  private socket: Socket | null = null;

  // Existing branch connection
  connect(branchId: string) {
    if (this.socket) return;

    this.socket = io('http://10.0.2.2:3000', {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected (branch):', this.socket?.id);
      this.socket?.emit('joinBranch', `branch_${branchId}`);
    });

    this.socket.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
    });

    this.socket.on('newOrder', (order: any) => {
      console.log('New order received:', order);
      const {addOrder} = useStore.getState();
      addOrder(order);
    });

    this.socket.on('syncmart:status', data => {
      console.log('Socket syncmart:status received:', data);
      const {setStoreStatus} = useStore.getState();
      setStoreStatus(data.storeStatus);
    });
  }

  // New customer connection for OrderDetail
  connectCustomer(customerId: string) {
    if (this.socket) return;

    this.socket = io('http://10.0.2.2:3000', {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected (customer):', this.socket?.id);
      this.socket?.emit('joinRoom', `customer_${customerId}`); // Matches app.js
    });

    this.socket.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
    });

    this.socket.on('orderPackedWithUpdates', data => {
      console.log('Packed order received:', data);
      const {updateOrder} = useStore.getState();
      updateOrder(data.orderId, {
        _id: data.orderId,
        orderId: data.orderId,
        status: 'packed',
        totalPrice: data.totalPrice,
        items: data.items.map((item: any) => ({
          _id: item.item, // Assumes backend sends item ID
          item: {name: item.name, price: item.price},
          count: item.count,
        })),
        deliveryServiceAvailable: data.deliveryServiceAvailable || false,
        modificationHistory: [{changes: data.changes}],
        customer: customerId,
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();
