import React, {useEffect} from 'react';
import {View, Text} from 'react-native';
import DeliveryServiceToggle from '../components/delivery/DeliveryServiceToggle';
import {useStore} from '../store/ordersStore';
import io from 'socket.io-client';

const socket = io('http://10.0.2.2:3000', {
  transports: ['websocket'],
  reconnection: true,
});

const DeliveryService: React.FC = () => {
  const {userId, setDeliveryServiceAvailable} = useStore();

  useEffect(() => {
    if (!userId) {
      console.error('No userId available - cannot connect to socket');
      return;
    }

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('joinBranch', userId);
    });

    socket.on('connect_error', err =>
      console.error('Socket connection error:', err.message),
    );

    socket.on('syncmart:delivery-service-available', data => {
      console.log('Socket syncmart:delivery-service-available received:', data);
      setDeliveryServiceAvailable(data.deliveryServiceAvailable);
    });

    return () => {
      socket.off('syncmart:delivery-service-available');
      socket.off('connect_error');
      socket.off('connect');
    };
  }, [userId, setDeliveryServiceAvailable]);

  if (!userId) {
    return <Text>Please log in to continue.</Text>;
  }

  return (
    <View>
      <Text>Delivery Service</Text>
      <DeliveryServiceToggle socket={socket} />
    </View>
  );
};

export default DeliveryService;
