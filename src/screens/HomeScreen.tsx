import React, {useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Header from '../components/dashboard/Header';
import OrderCard from '../components/dashboard/OrderCard';
import {useStore} from '../store/ordersStore';
import api from '../services/api'; // Added API import
import {DrawerNavigationProp} from '@react-navigation/drawer';
import {DrawerParamList} from '../navigation/Sidebar';

type HomeScreenNavigationProp = DrawerNavigationProp<DrawerParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {userId, orders, setStoreStatus, setOrders} = useStore();

  useEffect(() => {
    console.log('HomeScreen mounted with userId:', userId);
    if (!userId) {
      console.error('No userId available - redirecting to login');
      navigation.navigate('Authentication');
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await api.get('/orders/', {
          params: {branchId: userId}, // Filter by branch
        });
        setOrders(response.data); // Update store with fetched orders
      } catch (error) {
        console.error('Fetch Orders Error:', error);
        Alert.alert('Error', 'Failed to load orders');
      }
    };

    fetchOrders();
  }, [userId, navigation, setOrders]); // Added setOrders to dependencies

  const handleAccept = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/accept`);
      // Optionally update orders state after successful accept
      setOrders(
        orders.map(order =>
          order._id === orderId ? {...order, status: 'accepted'} : order,
        ),
      );
    } catch (error) {
      console.error('Accept Order Error:', error);
      Alert.alert('Error', 'Failed to accept order');
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/cancel`);
      // Optionally update orders state after successful reject
      setOrders(
        orders.map(order =>
          order._id === orderId ? {...order, status: 'cancelled'} : order,
        ),
      );
    } catch (error) {
      console.error('Reject Order Error:', error);
      Alert.alert('Error', 'Failed to reject order');
    }
  };

  const handleCancelItem = async (orderId: string, itemId: string) => {
    try {
      await api.patch(`/orders/${orderId}/cancel-item/${itemId}`);
      // Optionally update orders state after successful item cancel
      setOrders(
        orders.map(order =>
          order._id === orderId
            ? {...order, items: order.items.filter(item => item._id !== itemId)}
            : order,
        ),
      );
    } catch (error) {
      console.error('Cancel Item Error:', error);
      Alert.alert('Error', 'Failed to cancel item');
    }
  };

  if (!userId) {
    return <Text>Please log in to continue.</Text>;
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
