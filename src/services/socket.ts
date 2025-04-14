import {io, Socket} from 'socket.io-client';
import {storage} from '../utils/storage';
import {config} from '../config'; // Import config for SOCKET_URL
import {navigationRef} from '../../App';
import {Order, WalletTransaction} from '../store/ordersStore';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private handlers: {
    addOrder?: (order: Order) => void;
    updateOrder?: (orderId: string, order: Order) => void;
    setWalletBalance?: (balance: number) => void;
    addWalletTransaction?: (transaction: WalletTransaction) => void;
    orders?: Order[];
  } = {};

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
    // Store handlers at class level
    this.handlers = {...handlers};

    if (this.socket && this.socket.connected) {
      console.log('[Socket] Already connected, socket ID:', this.socket.id);
      return;
    }

    try {
      const token = storage.getString('accessToken');
      if (!token) {
        console.log('[Socket] No access token available for socket connection');
        return;
      }

      if (this.socket) {
        console.log('[Socket] Cleaning up existing socket before reconnection');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Remove /api from socket URL
      const socketUrl = config.SOCKET_URL.replace('/api', '');
      console.log('[Socket] Attempting connection to:', socketUrl);

      this.socket = io(socketUrl, {
        query: {branchId},
        extraHeaders: {
          Authorization: `Bearer ${token}`,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log(
          '[Socket] Connected successfully. Socket ID:',
          this.socket?.id,
        );

        if (this.socket) {
          // Join branch-specific room
          this.socket.emit('joinBranch', branchId);
          console.log('[Socket] Joined branch room:', branchId);

          // Join existing order rooms
          if (this.handlers.orders) {
            this.handlers.orders.forEach(order => {
              if (order._id) {
                this.socket?.emit('joinRoom', order._id);
                console.log('[Socket] Joined existing order room:', order._id);
              }
            });
          }
        }
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.socket.on('disconnect', reason => {
        console.log('[Socket] Disconnected. Reason:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', error => {
        console.log('[Socket] Connection Error:', error.message);
        this.isConnected = false;
      });

      // Debug all incoming events
      this.socket.onAny((eventName, ...args) => {
        console.log(
          '[Socket] Received event:',
          eventName,
          'Data:',
          JSON.stringify(args),
        );
      });

      // Handle new orders
      this.socket.on('newOrder', (orderData: any) => {
        console.log('[Socket] New order received:', orderData);
        try {
          if (!this.handlers.addOrder) {
            console.error('[Socket] addOrder handler is not defined');
            return;
          }

          // Transform the order data to match our interface
          const order: Order = {
            _id: orderData._id,
            branchId: orderData.branchId,
            customer: orderData.customer,
            items: orderData.items.map((item: any) => ({
              _id: item._id,
              item: item.item,
              count: item.count,
              price: item.price,
            })),
            branch: orderData.branch,
            status: orderData.status,
            deliveryEnabled: orderData.deliveryEnabled || false,
            statusHistory: orderData.statusHistory || [],
            totalPrice: orderData.totalPrice,
            deliveryLocation: orderData.deliveryLocation || {
              latitude: 0,
              longitude: 0,
              address: '',
            },
            pickupLocation: orderData.pickupLocation,
            orderID: orderData.orderID || orderData._id,
            manuallyCollected: orderData.manuallyCollected || false,
            modificationHistory: orderData.modificationHistory || [],
            createdAt: orderData.createdAt || new Date().toISOString(),
            updatedAt: orderData.updatedAt || new Date().toISOString(),
            __v: orderData.__v || 0,
          };

          // Join the order room
          this.socket?.emit('joinRoom', order._id);
          console.log('[Socket] Joined new order room:', order._id);

          // Add the order to the store
          this.handlers.addOrder(order);
          console.log('[Socket] Order added to store successfully');
        } catch (error) {
          console.error('[Socket] Error processing new order:', error);
        }
      });

      // Handle order updates
      this.socket.on('orderStatusUpdate', (orderData: any) => {
        console.log('[Socket] Order status update received:', orderData);
        try {
          if (!this.handlers.updateOrder) {
            console.error('[Socket] updateOrder handler is not defined');
            return;
          }

          const order: Order = {
            _id: orderData._id,
            branchId: orderData.branchId,
            customer: orderData.customer,
            items: orderData.items.map((item: any) => ({
              _id: item._id,
              item: item.item,
              count: item.count,
              price: item.price,
            })),
            branch: orderData.branch,
            status: orderData.status,
            deliveryEnabled: orderData.deliveryEnabled || false,
            statusHistory: orderData.statusHistory || [],
            totalPrice: orderData.totalPrice,
            deliveryLocation: orderData.deliveryLocation || {
              latitude: 0,
              longitude: 0,
              address: '',
            },
            pickupLocation: orderData.pickupLocation,
            orderID: orderData.orderID || orderData._id,
            manuallyCollected: orderData.manuallyCollected || false,
            modificationHistory: orderData.modificationHistory || [],
            createdAt: orderData.createdAt || new Date().toISOString(),
            updatedAt: orderData.updatedAt || new Date().toISOString(),
            __v: orderData.__v || 0,
          };
          this.handlers.updateOrder(order._id, order);
        } catch (error) {
          console.error('[Socket] Error processing order update:', error);
        }
      });

      // Handle wallet updates only if wallet handlers are provided
      if (
        this.handlers.setWalletBalance &&
        this.handlers.addWalletTransaction
      ) {
        this.setupWalletHandler(
          this.handlers.setWalletBalance,
          this.handlers.addWalletTransaction,
        );
      }
    } catch (error) {
      console.error('[Socket] Connection Setup Error:', error);
    }
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
