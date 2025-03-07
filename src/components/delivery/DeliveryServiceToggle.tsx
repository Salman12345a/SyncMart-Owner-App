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
  const {
    deliveryServiceAvailable,
    setDeliveryServiceAvailable,
    hasApprovedDeliveryPartner,
  } = useStore();

  const toggleDelivery = useCallback(async () => {
    const newEnabled = !deliveryServiceAvailable;

    // Prevent enabling unless there's an approved delivery partner
    if (newEnabled && !hasApprovedDeliveryPartner()) {
      console.log(
        'Cannot enable delivery service: No approved delivery partner',
      );
      return;
    }

    setDeliveryServiceAvailable(newEnabled);
    try {
      await api.patch('/syncmarts/delivery', {enable: newEnabled});
      socket.emit('syncmart:delivery-service-available', {
        deliveryServiceAvailable: newEnabled,
      });
    } catch (err) {
      console.error('Toggle Delivery Error:', err);
      setDeliveryServiceAvailable(deliveryServiceAvailable); // Revert on error
    }
  }, [
    deliveryServiceAvailable,
    setDeliveryServiceAvailable,
    socket,
    hasApprovedDeliveryPartner,
  ]);

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
        disabled={!deliveryServiceAvailable && !hasApprovedDeliveryPartner()} // Disable when off and no approved partner
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {marginVertical: 20},
  label: {marginBottom: 10, fontSize: 16},
});

export default DeliveryServiceToggle;
