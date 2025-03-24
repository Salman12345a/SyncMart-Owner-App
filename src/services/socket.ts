import {io, Socket} from 'socket.io-client';
import {useStore} from '../store/ordersStore';
import {navigationRef} from '../../App';

class SocketService {
  private socket: Socket | null = null;

  // Get current socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Emit event
  emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Socket not connected, cannot emit ${event}`);
    }
  }

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

  connectCustomer(customerId: string) {
    if (this.socket) return;

    this.socket = io('http://10.0.2.2:3000', {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected (customer):', this.socket?.id);
      this.socket?.emit('joinRoom', `customer_${customerId}`);
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
          _id: item.item,
          item: {name: item.name, price: item.price},
          count: item.count,
        })),
        deliveryServiceAvailable: data.deliveryServiceAvailable || false,
        modificationHistory: [{changes: data.changes}],
        customer: customerId,
      });
    });
  }

  connectBranchRegistration(phone: string) {
    if (this.socket) return;

    this.socket = io('http://10.0.2.2:3000', {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected (branch registration):', this.socket?.id);
      this.socket?.emit('joinSyncmartRoom', phone);
    });

    this.socket.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
    });

    this.socket.on('branchRegistered', data => {
      console.log('Branch registered:', data);
      const {addBranch} = useStore.getState();
      addBranch({id: data.branchId, status: data.status, phone: data.phone});
    });

    this.socket.on('branchStatusUpdated', data => {
      console.log('Branch status updated:', data);
      const {updateBranchStatus} = useStore.getState();
      updateBranchStatus(data.branchId, data.status);
    });

    this.socket.on('branchResubmitted', data => {
      console.log('Branch resubmitted:', data);
      const {updateBranchStatus} = useStore.getState();
      updateBranchStatus(data.branchId, data.status);
      if (navigationRef.current) {
        navigationRef.current.navigate('StatusScreen', {
          branchId: data.branchId,
        });
      }
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
