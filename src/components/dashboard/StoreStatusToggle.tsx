import React, {useCallback, useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import SwitchSelector from 'react-native-switch-selector';
import {useStore} from '../../store/ordersStore';
import api from '../../services/api';
import socketService from '../../services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StoreStatusToggle: React.FC = () => {
  const {storeStatus, setStoreStatus} = useStore();

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const phone = await AsyncStorage.getItem('branchPhone');
        if (phone) {
          console.log('Initializing socket with phone:', phone);
          socketService.connectBranchRegistration(phone);
        } else {
          console.warn('No branch phone found in AsyncStorage');
        }
      } catch (error) {
        console.error('Error initializing socket:', error);
      }
    };

    initializeSocket();

    // Optional cleanup
    return () => {
      // socketService.disconnect(); // Uncomment if you need to disconnect on unmount
    };
  }, []);

  const toggleSyncMartStatus = useCallback(async () => {
    const newStatus = storeStatus === 'open' ? 'closed' : 'open';
    setStoreStatus(newStatus);

    try {
      // Update status via API
      await api.post('/syncmarts/status', {storeStatus: newStatus});

      // Emit socket event
      socketService.emit('syncmart:status', {storeStatus: newStatus});
      console.log('Store status updated and emitted:', newStatus);
    } catch (err) {
      console.error('Toggle SyncMart Status Error:', err);
      setStoreStatus(storeStatus); // Revert on error
    }
  }, [storeStatus, setStoreStatus]);

  return (
    <View style={styles.container}>
      <SwitchSelector
        options={[
          {label: 'Open', value: 'open'},
          {label: 'Closed', value: 'closed'},
        ]}
        initial={storeStatus === 'open' ? 0 : 1}
        onPress={toggleSyncMartStatus}
        buttonColor="#FFFFFF"
        backgroundColor="rgba(255, 255, 255, 0.3)"
        borderColor="#007AFF"
        selectedColor="#007AFF"
        style={styles.switch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {width: 150},
  switch: {paddingVertical: 5},
});

export default StoreStatusToggle;
