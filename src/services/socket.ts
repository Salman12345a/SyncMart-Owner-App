import {io, Socket} from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(
    branchId: string,
    onNewOrder?: (order: any) => void,
    onStatusUpdate?: (data: any) => void,
  ) {
    console.log(`Attempting to connect socket for branchId: ${branchId}`);
    if (this.socket?.connected) {
      console.log('Socket already connected, ensuring room join');
      this.socket.emit('joinRoom', `branch_${branchId}`);
      return this.socket;
    }
    return this.connectSocket(`branch_${branchId}`, () => {
      if (onNewOrder) {
        this.socket?.on('newOrder', (order: any) => {
          console.log('New order received:', order);
          onNewOrder(order);
        });
      }
      if (onStatusUpdate) {
        this.socket?.on('syncmart:status', data => {
          console.log('Socket syncmart:status received:', data);
          onStatusUpdate(data);
        });
      }
    });
  }

  connectCustomer(customerId: string, onOrderPacked?: (data: any) => void) {
    console.log(`Attempting to connect socket for customerId: ${customerId}`);
    if (this.socket?.connected) {
      console.log('Socket already connected, ensuring room join');
      this.socket.emit('joinRoom', `customer_${customerId}`);
      return this.socket;
    }
    return this.connectSocket(`customer_${customerId}`, () => {
      if (onOrderPacked) {
        this.socket?.on('orderPackedWithUpdates', data => {
          console.log('Packed order received:', data);
          onOrderPacked(data);
        });
      }
    });
  }

  connectBranchRegistration(phone: string) {
    console.log(`Attempting to connect socket for phone: ${phone}`);
    const room = `syncmart_${phone}`;
    if (this.socket?.connected) {
      console.log('Socket already connected, ensuring room join');
      this.socket.emit('joinSyncmartRoom', phone);
      this.socket.emit('joinRoom', room);
      console.log(`Re-joined room ${room}`);
      return this.socket;
    }
    return this.connectSocket(room, () => {
      this.socket?.emit('joinSyncmartRoom', phone);
      console.log(`Joined room ${room}`);
    });
  }

  private connectSocket(room: string, setupListeners: () => void): Socket {
    console.log(`Connecting to socket server with room: ${room}`);
    if (!this.socket) {
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

      this.socket.onAny((event, ...args) => {
        console.log(`Received event: ${event}`, args);
      });
    }
    return this.socket;
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
