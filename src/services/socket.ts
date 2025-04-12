import {io, Socket} from 'socket.io-client';
import {useStore} from '../store/ordersStore';
import {navigationRef} from '../../App';
import {storage} from '../utils/storage';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

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
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected, not reconnecting');
      return;
    }

    try {
      // Get token from storage
      const token = storage.getString('accessToken');
      if (!token) {
        // Don't show error, just log info
        console.log('No access token available for main socket connection');
        return;
      }

      // Clean up any existing socket before creating a new one
      if (this.socket) {
        console.log('Cleaning up existing socket before reconnection');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Initialize socket with auth
      this.socket = io('http://10.0.2.2:3000', {
        query: {userId: branchId},
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        transports: ['websocket'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        console.log('Socket Connected, ID:', this.socket?.id);
        if (this.socket) {
          this.socket.emit('joinBranch', `branch_${branchId}`);
        }
        this.isConnected = true;
        this.connectionAttempts = 0; // Reset counter on successful connection
      });

      this.socket.on('disconnect', () => {
        console.log('Socket Disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', error => {
        console.log('Socket Connection Error:', error.message);
        this.isConnected = false;
      });

      // Dedicated handler for new orders
      this.setupOrderHandler(branchId);

      // Removed 'syncmart:status' listener to let StoreStatusToggle handle it
    } catch (error) {
      console.log('Socket Connection Setup Error:', error);
    }
  }

  // Extract order handling to a separate method to better manage it
  private setupOrderHandler(branchId: string) {
    if (!this.socket) return;

    // Handle new orders from socket
    this.socket.on('newOrder', (order: any) => {
      console.log(
        'New order received via socket:',
        order._id,
        'orderId:',
        order.orderId,
        'status:',
        order.status,
      );
      const {orders, addOrder} = useStore.getState();

      // Check if the order already exists in our store
      const orderExists = orders.some(o => o._id === order._id);
      if (orderExists) {
        console.log(
          'Order already exists in store, not adding duplicate:',
          order._id,
          'branch:',
          branchId,
        );
        return;
      }

      // Add this unique new order
      console.log(
        'Adding NEW socket order to store:',
        order._id,
        'orderId:',
        order.orderId,
      );
      addOrder(order);
    });
  }

  connectCustomer(customerId: string) {
    if (this.socket && this.socket.connected) return;

    this.socket = io('http://10.0.2.2:3000', {
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected (customer):', this.socket?.id);
      this.socket?.emit('joinRoom', `customer_${customerId}`);
      this.isConnected = true;
    });

    this.socket.on('connect_error', err => {
      console.log('Socket connection error (customer):', err.message);
      this.isConnected = false;
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
        deliveryServiceAvailable: data.deliveryEnabled || false,
        modificationHistory: [{changes: data.changes}],
        customer: customerId,
      });
    });
  }

  connectBranchRegistration(phone: string) {
    // Check if already connected
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected for branch registration');
      return;
    }

    // If we've already attempted too many times, don't keep trying
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('Max socket connection attempts reached, giving up');
      return;
    }

    this.connectionAttempts++;

    try {
      // Always connect for branch registration, with or without token
      console.log(
        `Connecting branch registration socket (attempt ${this.connectionAttempts})`,
      );

      this.socket = io('http://10.0.2.2:3000', {
        transports: ['websocket'],
        reconnection: true,
        query: {phone},
        // No extraHeaders needed for this connection type
      });

      this.socket.on('connect', () => {
        console.log('Socket connected (branch registration):', this.socket?.id);
        if (this.socket) {
          this.socket.emit('joinSyncmartRoom', phone);
        }
        this.isConnected = true;
        this.connectionAttempts = 0; // Reset counter on successful connection
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected (branch registration)');
        this.isConnected = false;
      });

      this.socket.on('connect_error', err => {
        console.log(
          'Socket connection error (branch registration):',
          err.message,
        );
        this.isConnected = false;
      });

      this.socket.on('branchRegistered', (data: any) => {
        console.log('Branch registered:', data);
        const {addBranch} = useStore.getState();
        // Create a minimal branch object with required fields
        addBranch({
          id: data.branchId,
          status: data.status,
          phone: data.phone,
          name: data.name || '',
          address: data.address || {
            street: '',
            area: '',
            city: '',
            pincode: '',
          },
          location: data.location || {type: 'Point', coordinates: [0, 0]},
          openingTime: data.openingTime || '',
          closingTime: data.closingTime || '',
          ownerName: data.ownerName || '',
          govId: data.govId || '',
          deliveryServiceAvailable: data.deliveryServiceAvailable || false,
          selfPickup: data.selfPickup || false,
          branchfrontImage: data.branchfrontImage || '',
          ownerIdProof: data.ownerIdProof || '',
          ownerPhoto: data.ownerPhoto || '',
        });
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
    } catch (error) {
      console.log(
        'Socket connection setup error (branch registration):',
        error,
      );
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Add method to check connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
    };
  }
}

export default new SocketService();
