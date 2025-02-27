// components/StoreStatusToggle.tsx
import React, {useCallback} from 'react';
import {View, StyleSheet} from 'react-native';
import SwitchSelector from 'react-native-switch-selector';
import {useStore} from '../store/store';
import api from '../services/api';

interface StoreStatusToggleProps {
  socket: any;
}

const StoreStatusToggle: React.FC<StoreStatusToggleProps> = ({socket}) => {
  const {storeStatus, setStoreStatus} = useStore();

  const toggleSyncMartStatus = useCallback(async () => {
    const newStatus = storeStatus === 'open' ? 'closed' : 'open';
    setStoreStatus(newStatus);
    try {
      await api.post('/syncmarts/status', {storeStatus: newStatus});
      socket.emit('syncmart:status', {storeStatus: newStatus});
    } catch (err) {
      console.error('Toggle SyncMart Status Error:', err);
      setStoreStatus(storeStatus);
    }
  }, [storeStatus, setStoreStatus, socket]);

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
  container: {
    width: 150,
  },
  switch: {
    paddingVertical: 5,
  },
});

export default StoreStatusToggle;
