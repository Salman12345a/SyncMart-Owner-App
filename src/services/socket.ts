import {io, Socket} from 'socket.io-client';
import {useStore} from '../store/ordersStore';

class SocketService {
  private socket: Socket | null = null;

  connect(branchId: string) {
    if (this.socket?.connected) return;
    this.connectSocket(`branch_${branchId}`, () => {
      this.socket?.on('newOrder', (order: any) => {
        console.log('New order received:', order);
        const {addOrder} = useStore.getState();
        addOrder(order);
      });
      this.socket?.on('syncmart:status', data => {
        console.log('Socket syncmart:status received:', data);
        const {setStoreStatus} = useStore.getState();
        setStoreStatus(data.storeStatus);
      });
    });
  }

  connectCustomer(customerId: string) {
    if (this.socket?.connected) return;
    this.connectSocket(`customer_${customerId}`, () => {
      this.socket?.on('orderPackedWithUpdates', data => {
        console.log('Packed order received:', data);
        const {updateOrder} = useStore.getState();
        updateOrder(data.orderId, {
          _id: data.orderId,
          orderId: data.orderId,
          status: 'packed',
          totalPrice: data.totalPrice,
          items: data.items.map((item: any) => ({
            _id: item.item,
            item: {name: item.name, price: item.price},
            count: item.count,
          })),
          deliveryServiceAvailable: data.deliveryServiceAvailable || false,
          modificationHistory: [{changes: data.changes}],
          customer: customerId,
        });
      });
    });
  }

  connectBranchRegistration(branchId: string) {
    if (this.socket?.connected) return;
    this.connectSocket(branchId, () => {
      this.socket?.emit('joinBranchRegistration', branchId);
      this.socket?.on(
        'branchStatusUpdate',
        (data: {id: string; status: string}) => {
          console.log('Branch status update received:', data);
        },
      );
    });
  }

  private connectSocket(room: string, setupListeners: () => void) {
    this.socket = io('http://10.0.2.2:3000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id, 'Room:', room);
      this.socket?.emit('joinRoom', room);
      setupListeners();
    });

    this.socket.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
