import React, {useEffect} from 'react';
import {View, Text, Button} from 'react-native';
import DeliveryServiceToggle from '../components/delivery/DeliveryServiceToggle';
import {useStore} from '../store/ordersStore';
import io from 'socket.io-client';
import {fetchDeliveryPartners} from '../services/api';

const socket = io('http://10.0.2.2:3000', {
  transports: ['websocket'],
  reconnection: true,
});

const DeliveryService: React.FC = ({navigation}) => {
  const {
    userId,
    setDeliveryServiceAvailable,
    deliveryPartners,
    setDeliveryPartners,
  } = useStore();

  useEffect(() => {
    if (!userId) {
      console.error(
        'No userId available - cannot connect to socket or fetch data',
      );
      return;
    }

    // Fetch delivery partners on mount
    const syncDeliveryPartners = async () => {
      try {
        const partners = await fetchDeliveryPartners(userId);
        setDeliveryPartners(partners.map(p => ({id: p._id, status: p.status}))); // Adjust mapping based on backend response
      } catch (error) {
        console.error('Failed to fetch delivery partners:', error);
      }
    };
    syncDeliveryPartners();

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
  }, [userId, setDeliveryServiceAvailable, setDeliveryPartners]);

  if (!userId) {
    return <Text>Please log in to continue.</Text>;
  }

  return (
    <View>
      <Text>Delivery Service</Text>
      <DeliveryServiceToggle socket={socket} />
      <Button
        title="Register Delivery Partner"
        onPress={() => navigation.navigate('DeliveryPartnerAuth')}
      />
      {deliveryPartners.length > 0 && (
        <View style={{marginTop: 20}}>
          <Text>Registered Delivery Partners:</Text>
          {deliveryPartners.map(partner => (
            <Text key={partner.id}>
              ID: {partner.id}, Status: {partner.status}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

export default DeliveryService;
