// HomeScreen.tsx
import React, {useEffect} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import Header from '../components/Header';
import DeliveryServiceToggle from '../components/DeliveryServiceToggle';
import {useStore} from '../store/store';
import io from 'socket.io-client';
import {DrawerNavigationProp} from '@react-navigation/drawer'; // Add this
import {DrawerParamList} from '../navigation/Sidebar'; // Adjust path

const socket = io('http://10.0.2.2:3000', {
  transports: ['websocket'],
  reconnection: true,
});

type HomeScreenNavigationProp = DrawerNavigationProp<DrawerParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp; // Add navigation prop
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
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
      socket.emit('joinBranch', userId);
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
    };
  }, [userId, setStoreStatus, setDeliveryServiceAvailable]);

  if (!userId) {
    return <Text>Please log in to continue.</Text>;
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} showStoreStatus socket={socket} />
      <View style={styles.content}>
        <DeliveryServiceToggle socket={socket} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 20},
});

export default HomeScreen;
