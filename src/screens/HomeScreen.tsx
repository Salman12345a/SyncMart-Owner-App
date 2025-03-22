import React, {useEffect, useCallback, useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/dashboard/Header';
import OrderCard from '../components/dashboard/OrderCard';
import {useStore} from '../store/ordersStore';
import api from '../services/api';
import {DrawerNavigationProp} from '@react-navigation/drawer';
import {DrawerParamList} from '../navigation/Sidebar';

type HomeScreenNavigationProp = DrawerNavigationProp<DrawerParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {branch, orders, setStoreStatus, setOrders, setUserId} = useStore();
  const [userId, setLocalUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(
    async (branchId: string) => {
      try {
        const response = await api.get('/orders/', {
          params: {branchId},
        });
        console.log('Orders fetched successfully:', response.data);
        setOrders(response.data); // Adjust if response.data.orders
      } catch (error) {
        console.error('Fetch Orders Error:', error);
        Alert.alert('Error', 'Failed to load orders');
      }
    },
    [setOrders],
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        const storedAccessToken = await AsyncStorage.getItem('accessToken');
        console.log(
          'HomeScreen mounted with userId:',
          storedUserId,
          'accessToken:',
          storedAccessToken,
        );

        if (!storedAccessToken) {
          console.error('No accessToken available - redirecting to login');
          navigation.reset({index: 0, routes: [{name: 'Authentication'}]});
          return;
        }

        let finalUserId = storedUserId;
        if (storedAccessToken) {
          try {
            const tokenPayload = JSON.parse(
              atob(storedAccessToken.split('.')[1]),
            );
            console.log('Token Payload:', tokenPayload);
            if (!storedUserId || storedUserId !== tokenPayload.branchId) {
              console.warn('Mismatch between stored userId and token branchId');
              finalUserId = tokenPayload.branchId;
              await AsyncStorage.setItem('userId', finalUserId);
              console.log('Updated AsyncStorage userId to:', finalUserId);
            }
          } catch (e) {
            console.warn('Failed to decode token:', e);
          }
        }

        if (!finalUserId) {
          console.error('No userId available - redirecting to login');
          navigation.reset({index: 0, routes: [{name: 'Authentication'}]});
          return;
        }

        setLocalUserId(finalUserId);
        setAccessToken(storedAccessToken);
        setUserId(finalUserId); // Sync store
        console.log('Store state after setUserId:', useStore.getState());

        fetchOrders(finalUserId);
      } catch (error) {
        console.error('Auth check error:', error);
        navigation.reset({index: 0, routes: [{name: 'Authentication'}]});
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigation, fetchOrders, setUserId]);

  const handleAccept = useCallback(
    async (orderId: string) => {
      try {
        await api.patch(`/orders/${orderId}/accept`, null);
        setOrders(
          orders.map(order =>
            order._id === orderId ? {...order, status: 'accepted'} : order,
          ),
        );
      } catch (error) {
        console.error('Accept Order Error:', error);
        Alert.alert('Error', 'Failed to accept order');
      }
    },
    [orders, setOrders],
  );

  const handleReject = useCallback(
    async (orderId: string) => {
      try {
        await api.patch(`/orders/${orderId}/cancel`, null);
        setOrders(
          orders.map(order =>
            order._id === orderId ? {...order, status: 'cancelled'} : order,
          ),
        );
      } catch (error) {
        console.error('Reject Order Error:', error);
        Alert.alert('Error', 'Failed to reject order');
      }
    },
    [orders, setOrders],
  );

  const handleCancelItem = useCallback(
    async (orderId: string, itemId: string) => {
      try {
        await api.patch(`/orders/${orderId}/cancel-item/${itemId}`, null);
        setOrders(
          orders.map(order =>
            order._id === orderId
              ? {
                  ...order,
                  items: order.items.filter(item => item._id !== itemId),
                }
              : order,
          ),
        );
      } catch (error) {
        console.error('Cancel Item Error:', error);
        Alert.alert('Error', 'Failed to cancel item');
      }
    },
    [orders, setOrders],
  );

  if (isLoading) {
    return <Text>Loading authentication...</Text>;
  }

  if (!userId || !accessToken) {
    return null; // Navigation.reset already handled
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} showStoreStatus />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to the Dashboard!</Text>
        <FlatList
          data={orders.filter(o => o.status !== 'packed')}
          renderItem={({item}) => (
            <OrderCard
              order={item}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancelItem={handleCancelItem}
              navigation={navigation}
            />
          )}
          keyExtractor={item => item._id}
          ListEmptyComponent={<Text>No pending orders</Text>}
          contentContainerStyle={styles.orderList}
        />
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('OrderPackedScreen')}
        style={styles.packedOrderButton}>
        <Text style={styles.packedOrderButtonText}>Packed Order</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 20, flex: 1},
  title: {fontSize: 20, marginBottom: 10, color: '#333'},
  orderList: {paddingBottom: 20},
  packedOrderButton: {
    backgroundColor: '#28a745',
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  packedOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;
