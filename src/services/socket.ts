import {io, Socket} from 'socket.io-client';
import {storage} from '../utils/storage';
import {config} from '../config';
import {WalletTransaction} from '../store/ordersStore';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private handlers: {
    setWalletBalance?: (balance: number) => void;
    addWalletTransaction?: (transaction: WalletTransaction) => void;
  } = {};

  getSocket(): Socket | null {
    return this.socket;
  }

  emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.send(event, data);
    } else {
      console.warn(`Socket not connected, cannot emit ${event}`);
    }
  }

  connect(
    branchId: string,
    handlers: {
      setWalletBalance: (balance: number) => void;
      addWalletTransaction: (transaction: WalletTransaction) => void;
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

      // Handle wallet updates
      if (
        this.handlers.setWalletBalance &&
        this.handlers.addWalletTransaction
      ) {
        this.setupWalletHandler(
          this.handlers.setWalletBalance,
          this.handlers.addWalletTransaction,
        );
      }

      // Add other feature-specific socket handlers here
      this.setupOtherFeatureHandlers();
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
        orderNumber: transaction.orderId || undefined,
      });
    });
  }

  private setupOtherFeatureHandlers() {
    if (!this.socket) return;

    // Add handlers for other features here
    // Example:
    // this.socket.on('featureEvent', (data) => {
    //   // Handle feature event
    // });
  }

  connectCustomer(
    customerId: string,
    updateOrderCallback: (orderId: string, updatedData: any) => void,
  ) {
    if (!this.socket || !this.socket.connected) {
      const token = storage.getString('accessToken');
      if (!token) {
        console.log('[Socket] No access token available for socket connection');
        return;
      }

      const socketUrl = config.SOCKET_URL.replace('/api', '');
      console.log('[Socket] Attempting customer connection to:', socketUrl);

      this.socket = io(socketUrl, {
        query: {customerId},
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
          '[Socket] Customer connected successfully. Socket ID:',
          this.socket?.id,
        );
        this.isConnected = true;
      });

      this.socket.on('orderUpdated', ({orderId, ...updatedData}) => {
        console.log('[Socket] Order updated:', orderId, updatedData);
        updateOrderCallback(orderId, updatedData);
      });

      this.socket.on('disconnect', reason => {
        console.log('[Socket] Customer disconnected. Reason:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', error => {
        console.log('[Socket] Customer connection error:', error.message);
        this.isConnected = false;
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

export default new SocketService();
