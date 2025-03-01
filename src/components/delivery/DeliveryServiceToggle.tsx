import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import SwitchSelector from 'react-native-switch-selector';
import {useStore} from '../../store/ordersStore';
import api from '../../services/api';

interface DeliveryServiceToggleProps {
  socket: any;
}

const DeliveryServiceToggle: React.FC<DeliveryServiceToggleProps> = ({
  socket,
}) => {
  const {deliveryServiceAvailable, setDeliveryServiceAvailable} = useStore();

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
      setDeliveryServiceAvailable(deliveryServiceAvailable);
    }
  }, [deliveryServiceAvailable, setDeliveryServiceAvailable, socket]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Delivery Service: {deliveryServiceAvailable ? 'Enabled' : 'Disabled'}
      </Text>
      <SwitchSelector
        options={[
          {label: 'Enabled', value: true},
          {label: 'Disabled', value: false},
        ]}
        initial={deliveryServiceAvailable ? 0 : 1}
        onPress={toggleDelivery}
        buttonColor="#007AFF"
        backgroundColor="#fff"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {marginVertical: 20},
  label: {marginBottom: 10, fontSize: 16},
});

export default DeliveryServiceToggle;
