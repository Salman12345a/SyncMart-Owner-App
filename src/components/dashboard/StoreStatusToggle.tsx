import React, {useCallback, useEffect, useRef} from 'react';
import {View, StyleSheet} from 'react-native';
import SwitchSelector from 'react-native-switch-selector';
import {useStore} from '../../store/ordersStore';
import api from '../../services/api';
import socketService from '../../services/socket';

const StoreStatusToggle: React.FC = () => {
  const {storeStatus, setStoreStatus} = useStore();
  const isToggling = useRef(false);
  const switchRef = useRef<any>(null);

  // Fetch initial storeStatus from server
  useEffect(() => {
    const syncStoreStatus = async () => {
      try {
        const response = await api.get('/syncmarts/status');
        const {storeStatus: serverStatus} = response.data;
        if (serverStatus === 'open' || serverStatus === 'closed') {
          setStoreStatus(serverStatus);
        }
      } catch (error) {
        console.error(
          'Error fetching storeStatus:',
          error.response?.data || error.message,
        );
      }
    };

    syncStoreStatus();
  }, [setStoreStatus]);

  // Socket setup for syncmart:status
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleStatusUpdate = (data: {storeStatus: string}) => {
      if (isToggling.current) return;
      if (data.storeStatus !== storeStatus) {
        setStoreStatus(data.storeStatus);
        // Force update switch position without triggering onPress
        if (switchRef.current) {
          switchRef.current.setValue(data.storeStatus === 'open' ? 0 : 1);
        }
      }
    };

    socket.on('syncmart:status', handleStatusUpdate);
    return () => {
      socket.off('syncmart:status', handleStatusUpdate);
    };
  }, [storeStatus, setStoreStatus]);

  const toggleSyncMartStatus = useCallback(
    async (value: number) => {
      // Only proceed if this is a user-initiated change
      const newStatus = value === 0 ? 'open' : 'closed';
      if (newStatus === storeStatus) return;

      isToggling.current = true;
      try {
        const response = await api.post('/syncmarts/status', {
          storeStatus: newStatus,
        });
        setStoreStatus(response.data.storeStatus);
      } catch (err) {
        console.error('Toggle Error:', err.response?.data || err.message);
        // Revert switch position if API call fails
        if (switchRef.current) {
          switchRef.current.setValue(storeStatus === 'open' ? 0 : 1);
        }
      } finally {
        setTimeout(() => {
          isToggling.current = false;
        }, 1500);
      }
    },
    [storeStatus, setStoreStatus],
  );

  return (
    <View style={styles.container}>
      <SwitchSelector
        ref={switchRef}
        options={[
          {label: 'Open', value: 0},
          {label: 'Closed', value: 1},
        ]}
        initial={storeStatus === 'open' ? 0 : 1}
        value={storeStatus === 'open' ? 0 : 1}
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
