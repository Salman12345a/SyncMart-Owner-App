import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import Header from '../components/Header';
import StoreToggle from '../components/StoreToggle';
import {useStore} from '../store/store';
import api from '../services/api';
import io from 'socket.io-client';

export default function HomeScreen() {
  const {storeStatus, deliveryEnabled, setStoreStatus, setDeliveryEnabled} =
    useStore();

  useEffect(() => {
    const socket = io('http://localhost:3000');
    socket.on('store:status', data => setStoreStatus(data.storeStatus));
    socket.on('store:delivery-status', data =>
      setDeliveryEnabled(data.deliveryEnabled),
    );

    return () => socket.disconnect();
  }, [setStoreStatus, setDeliveryEnabled]);

  useEffect(() => {
    const fetchStoreStatus = async () => {
      try {
        const response = await api.get('/stores/status');
        setStoreStatus(response.data.storeStatus);
        setDeliveryEnabled(response.data.deliveryEnabled);
      } catch (err) {
        console.error('Fetch Store Status Error:', err);
      }
    };
    fetchStoreStatus();
  }, [setStoreStatus, setDeliveryEnabled]);

  return (
    <View style={styles.container}>
      <Header title="SyncMart Store Owner" />
      <StoreToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
});
