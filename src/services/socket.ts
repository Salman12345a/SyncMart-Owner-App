import {io, Socket} from 'socket.io-client';
import {useStore} from '../store/ordersStore';

class SocketService {
  private socket: Socket | null = null;

  connect(branchId: string) {
    if (this.socket) return;

    this.socket = io('http://10.0.2.2:3000', {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.socket?.emit('joinBranch', `branch_${branchId}`); // Join branch room
    });

    this.socket.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
    });

    this.socket.on('newOrder', (order: any) => {
      console.log('New order received:', order);
      const {addOrder} = useStore.getState(); // Access Zustand setters
      addOrder(order); // Add to store
    });

    this.socket.on('syncmart:status', data => {
      console.log('Socket syncmart:status received:', data);
      const {setStoreStatus} = useStore.getState();
      setStoreStatus(data.storeStatus);
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
