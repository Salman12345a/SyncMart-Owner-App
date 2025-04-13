import {io, Socket} from 'socket.io-client';
import {storage} from '../utils/storage';
import {config} from '../config'; // Import config for SOCKET_URL
import {navigationRef} from '../../App';

// Types from ordersStore.ts
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

interface WalletTransaction {
  amount: number;
  type: 'platform_charge' | 'payment';
  timestamp: string;
  _id?: string;
  orderNumber?: string;
  status?: 'pending' | 'settled';
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;

  getSocket(): Socket | null {
    return this.socket;
  }

  emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Socket not connected, cannot emit ${event}`);
    }
  }

  connect(
    branchId: string,
    handlers: {
      addOrder: (order: Order) => void;
      updateOrder: (orderId: string, order: Order) => void;
      setWalletBalance: (balance: number) => void;
      addWalletTransaction: (transaction: WalletTransaction) => void;
      orders: Order[];
    },
  ) {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected, not reconnecting');
      return;
    }

    try {
      const token = storage.getString('accessToken');
      if (!token) {
        console.log('No access token available for socket connection');
        return;
      }

      if (this.socket) {
        console.log('Cleaning up existing socket before reconnection');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io(config.SOCKET_URL, {
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
          this.socket.emit('joinWalletRoom', {branchId}); // Join wallet room
          console.log(`Joined branch_${branchId} and wallet_${branchId}`);
          // Join existing order rooms
          handlers.orders.forEach(order => {
            this.socket?.emit('joinRoom', order._id);
            console.log(`Joined order room: ${order._id}`);
          });
        }
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.socket.on('disconnect', () => {
        console.log('Socket Disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', error => {
        console.log('Socket Connection Error:', error.message);
        this.isConnected = false;
      });

      this.setupOrderHandler(handlers.addOrder, handlers.updateOrder);
      this.setupWalletHandler(
        handlers.setWalletBalance,
        handlers.addWalletTransaction,
      );
    } catch (error) {
      console.log('Socket Connection Setup Error:', error);
    }
  }

  private setupOrderHandler(
    addOrder: (order: Order) => void,
    updateOrder: (orderId: string, order: Order) => void,
  ) {
    if (!this.socket) return;

    this.socket.on('newOrder', (order: Order) => {
      console.log(
        'New order received via socket:',
        order._id,
        'orderId:',
        order.orderId,
      );
      addOrder({
        ...order,
        deliveryServiceAvailable: order.deliveryEnabled,
      });
      this.socket?.emit('joinRoom', order._id);
      console.log(`Joined new order room: ${order._id}`);
    });

    this.socket.on('orderStatusUpdate', (order: Order) => {
      console.log('Order status updated:', order._id, order.status);
      updateOrder(order._id, {
        ...order,
        deliveryServiceAvailable: order.deliveryEnabled,
      });
    });
  }

  private setupWalletHandler(
    setWalletBalance: (balance: number) => void,
    addWalletTransaction: (transaction: WalletTransaction) => void,
  ) {
    if (!this.socket) return;

    this.socket.on('walletUpdated', ({branchId, newBalance, transaction}) => {
      console.log(`Wallet updated for branch ${branchId}:`, {
        newBalance,
        transaction,
      });
      setWalletBalance(newBalance);
      addWalletTransaction({
        ...transaction,
        timestamp: transaction.timestamp,
        status: transaction.type === 'platform_charge' ? 'settled' : 'pending',
        orderNumber: transaction.orderId || undefined, // If backend adds orderId
      });
    });

    this.socket.on('walletUpdateTrigger', ({branchId, orderId, totalPrice}) => {
      console.log(
        `Wallet update triggered for branch ${branchId}, order ${orderId}`,
      );
    });
  }

  connectCustomer(
    customerId: string,
    updateOrder: (orderId: string, order: Order) => void,
  ) {
    if (this.socket && this.socket.connected) return;

    this.socket = io(config.SOCKET_URL, {
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

  connectBranchRegistration(
    phone: string,
    addBranch: (branch: any) => void,
    updateBranchStatus: (branchId: string, status: string) => void,
  ) {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected for branch registration');
      return;
    }

    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('Max socket connection attempts reached, giving up');
      return;
    }

    this.connectionAttempts++;

    try {
      console.log(
        `Connecting branch registration socket (attempt ${this.connectionAttempts})`,
      );

      this.socket = io(config.SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        query: {phone},
      });

      this.socket.on('connect', () => {
        console.log('Socket connected (branch registration):', this.socket?.id);
        this.socket?.emit('joinSyncmartRoom', phone);
        this.isConnected = true;
        this.connectionAttempts = 0;
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
        updateBranchStatus(data.branchId, data.status);
      });

      this.socket.on('branchResubmitted', data => {
        console.log('Branch resubmitted:', data);
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

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id,
    };
  }
}

export default new SocketService();
