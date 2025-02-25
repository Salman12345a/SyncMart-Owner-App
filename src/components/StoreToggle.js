import React from 'react';
import {Switch, Text, View, StyleSheet} from 'react-native';
import {useStore} from '../store/store';
import api from '../services/api';

const StoreToggle = () => {
  const {storeStatus, deliveryEnabled, setStoreStatus, setDeliveryEnabled} =
    useStore();

  const toggleStoreStatus = async () => {
    const newStatus = storeStatus === 'open' ? 'closed' : 'open';
    setStoreStatus(newStatus);
    await api.patch('/stores/status', {storeStatus: newStatus});
    // Emit Socket.IO event
    const socket = io('http://localhost:3000'); // Adjust to your backend URL
    socket.emit('store:status', {storeStatus: newStatus});
  };

  const toggleDelivery = async () => {
    const newEnabled = !deliveryEnabled;
    setDeliveryEnabled(newEnabled);
    await api.patch('/stores/status', {deliveryEnabled: newEnabled});
    const socket = io('http://localhost:3000');
    socket.emit('store:delivery-status', {deliveryEnabled: newEnabled});
  };

  return (
    <View style={styles.container}>
      <View style={styles.toggle}>
        <Text>Store Status: {storeStatus}</Text>
        <Switch
          value={storeStatus === 'open'}
          onValueChange={toggleStoreStatus}
        />
      </View>
      <View style={styles.toggle}>
        <Text>
          Delivery Service: {deliveryEnabled ? 'Enabled' : 'Disabled'}
        </Text>
        <Switch value={deliveryEnabled} onValueChange={toggleDelivery} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20},
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
});

export default StoreToggle;
