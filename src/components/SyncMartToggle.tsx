import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import SwitchSelector from 'react-native-switch-selector';
import {useStore} from '../store/store';
import api from '../services/api';

interface SyncMartToggleProps {
  socket: any; // Replace with proper Socket.IO type if using TypeScript
}

const SyncMartToggle: React.FC<SyncMartToggleProps> = ({socket}) => {
  const {
    storeStatus,
    deliveryServiceAvailable,
    setStoreStatus,
    setDeliveryServiceAvailable,
  } = useStore();

  const toggleSyncMartStatus = useCallback(async () => {
    const newStatus = storeStatus === 'open' ? 'closed' : 'open';
    setStoreStatus(newStatus);
    try {
      await api.post('/syncmarts/status', {storeStatus: newStatus});
      socket.emit('syncmart:status', {storeStatus: newStatus});
    } catch (err) {
      console.error('Toggle SyncMart Status Error:', err);
      setStoreStatus(storeStatus); // Revert on failure
    }
  }, [storeStatus, setStoreStatus, socket]);

  const toggleDelivery = useCallback(async () => {
    const newEnabled = !deliveryServiceAvailable;
    setDeliveryServiceAvailable(newEnabled);
    try {
      await api.patch('/syncmarts/delivery', {enable: newEnabled});
      socket.emit('syncmart:delivery-service-available', {
        deliveryServiceAvailable: newEnabled,
      });
    } catch (err) {
      console.error('Toggle Delivery Error:', err);
      setDeliveryServiceAvailable(deliveryServiceAvailable); // Revert on failure
    }
  }, [deliveryServiceAvailable, setDeliveryServiceAvailable, socket]);

  return (
    <View style={styles.container}>
      <View style={styles.toggle}>
        <Text>SyncMart Status: {storeStatus}</Text>
        <SwitchSelector
          options={[
            {label: 'Open', value: 'open'},
            {label: 'Closed', value: 'closed'},
          ]}
          initial={storeStatus === 'open' ? 0 : 1}
          onPress={() => toggleSyncMartStatus()}
          buttonColor="#007AFF"
          backgroundColor="#fff"
        />
      </View>
      <View style={styles.toggle}>
        <Text>
          Delivery Service: {deliveryServiceAvailable ? 'Enabled' : 'Disabled'}
        </Text>
        <SwitchSelector
          options={[
            {label: 'Enabled', value: true},
            {label: 'Disabled', value: false},
          ]}
          initial={deliveryServiceAvailable ? 0 : 1}
          onPress={() => toggleDelivery()}
          buttonColor="#007AFF"
          backgroundColor="#fff"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20},
  toggle: {marginVertical: 10},
});

export default SyncMartToggle;
