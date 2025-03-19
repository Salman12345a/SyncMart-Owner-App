import {io, Socket} from 'socket.io-client';
import {useStore} from '../store/ordersStore';

class SocketService {
  private socket: Socket | null = null;

  connect(branchId: string) {
    console.log(`Attempting to connect socket for branchId: ${branchId}`);
    if (this.socket?.connected) {
      console.log('Socket already connected, skipping connect');
      return;
    }
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
    console.log(`Attempting to connect socket for customerId: ${customerId}`);
    if (this.socket?.connected) {
      console.log('Socket already connected, skipping connect');
      return;
    }
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

  connectBranchRegistration(phone: string) {
    console.log(`Attempting to connect socket for phone: ${phone}`);
    if (this.socket?.connected) {
      console.log('Socket already connected, disconnecting first');
      this.socket.disconnect();
    }
    this.connectSocket(`syncmart_${phone}`, () => {
      this.socket?.emit('joinSyncmartRoom', phone);
      console.log(`Joined room syncmart_${phone}`);
    });
  }

  private connectSocket(room: string, setupListeners: () => void) {
    console.log(`Connecting to socket server with room: ${room}`);
    this.socket = io('http://10.0.2.2:3000', {
      // Matches backend on host machine from emulator
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

    this.socket.on('reconnect_attempt', attempt => {
      console.log(`Reconnection attempt #${attempt}`);
    });

    this.socket.on('reconnect', attempt => {
      console.log(`Reconnected after ${attempt} attempts`);
      this.socket?.emit('joinRoom', room);
      setupListeners();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Log all incoming events for debugging
    this.socket.onAny((event, ...args) => {
      console.log(`Received event: ${event}`, args);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
