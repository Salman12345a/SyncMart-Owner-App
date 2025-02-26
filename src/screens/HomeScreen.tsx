import React, {useEffect} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import Header from '../components/Header';
import SyncMartToggle from '../components/SyncMartToggle';
import {useStore} from '../store/store';
import io from 'socket.io-client';

const socket = io('http://10.0.2.2:3000', {
  transports: ['websocket'],
  reconnection: true,
});

const HomeScreen: React.FC = () => {
  const {
    storeStatus,
    deliveryServiceAvailable,
    userId,
    setStoreStatus,
    setDeliveryServiceAvailable,
  } = useStore();

  useEffect(() => {
    if (!userId) {
      console.error('No userId available - redirecting to login');
      return;
    }

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('joinBranch', userId); // Join branch room
    });
    socket.on('connect_error', err =>
      console.error('Socket connection error:', err.message),
    );
    socket.on('syncmart:status', data => {
      console.log('Socket syncmart:status received:', data);
      setStoreStatus(data.storeStatus);
    });
    socket.on('syncmart:delivery-service-available', data => {
      console.log('Socket syncmart:delivery-service-available received:', data);
      setDeliveryServiceAvailable(data.deliveryServiceAvailable);
    });

    return () => {
      socket.off('syncmart:status');
      socket.off('syncmart:delivery-service-available');
      socket.off('connect_error');
      // Don’t disconnect here - keep it alive for SyncMartToggle
    };
  }, [userId, setStoreStatus, setDeliveryServiceAvailable]);

  if (!userId) {
    return <Text>Please log in to continue.</Text>;
  }

  return (
    <View style={styles.container}>
      <Header title="SyncMart Home" />
      <SyncMartToggle socket={socket} /> {/* Pass socket to reuse */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
});

export default HomeScreen;
