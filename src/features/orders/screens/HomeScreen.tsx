import React, {useEffect, useCallback, useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {storage} from '../../../utils/storage';
import socketService from '../../../services/socket';
import Header from '../../../components/dashboard/Header';
import OrderCard from '../../../components/order/OrderCard';
import {useStore} from '../../../store/ordersStore';
import api from '../../../services/api';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import {jwtDecode} from 'jwt-decode';

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'HomeScreen'
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

// Custom token payload interface
interface TokenPayload {
  userId?: string;
  branchId?: string;
  exp?: number;
  iat?: number;
}

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {storeStatus, orders, setStoreStatus, setOrders, setUserId} =
    useStore();
  const [userId, setLocalUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(
    async (branchId: string) => {
      try {
        // Log fetch attempt
        console.log('Fetching orders for branchId:', branchId);

        // Check if we have a token before making the request
        const token = storage.getString('accessToken');
        if (!token) {
          console.error(
            'No token available for order fetch - redirecting to login',
          );
          navigation.reset({
            index: 0,
            routes: [{name: 'Authentication'}],
          });
          return;
        }

        // Log the token being used (partially redacted)
        console.log('Using token for fetch:', token.substring(0, 10) + '...');

        // Check if branch is approved
        const isApproved = storage.getBoolean('isApproved');
        if (!isApproved) {
          console.error('Branch not approved - redirecting to StatusScreen');
          navigation.reset({
            index: 0,
            routes: [{name: 'StatusScreen', params: {branchId}}],
          });
          return;
        }

        const response = await api.get('/orders/', {
          params: {branchId},
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(
          'Orders fetched successfully:',
          response.data?.length || 0,
          'orders',
        );
        setOrders(response.data || []);
      } catch (error: any) {
        console.error(
          'Fetch Orders Error:',
          error?.response?.status,
          error?.response?.data || error?.message || error,
        );

        // Handle unauthorized errors
        if (error?.response?.status === 401) {
          console.log('Unauthorized during order fetch - redirecting to login');
          storage.delete('accessToken');
          storage.delete('userId');
          Alert.alert(
            'Session Expired',
            'Your session has expired. Please login again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{name: 'Authentication'}],
                  });
                },
              },
            ],
          );
          return;
        }

        Alert.alert('Error', 'Failed to load orders. Please try again.');
      }
    },
    [setOrders, navigation],
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUserId = storage.getString('userId');
        const storedBranchId = storage.getString('branchId');
        const storedAccessToken = storage.getString('accessToken');
        const isApproved = storage.getBoolean('isApproved') || false;

        console.log(
          'HomeScreen mounted with userId:',
          storedUserId,
          'branchId:',
          storedBranchId,
          'accessToken:',
          storedAccessToken ? 'present' : 'missing',
          'isApproved:',
          isApproved,
        );

        // In case we're coming from StatusScreen approval, ensure userId = branchId
        if (storedBranchId && !storedUserId) {
          console.log('Setting userId from branchId for consistency');
          storage.set('userId', storedBranchId);
          setUserId(storedBranchId);
        }

        if (!storedAccessToken) {
          console.error('No accessToken available - redirecting to login');
          navigation.reset({
            index: 0,
            routes: [{name: 'Authentication'}],
          });
          return;
        }

        // If not approved, redirect to StatusScreen
        if (!isApproved) {
          const idToUse = storedUserId || storedBranchId;
          if (idToUse) {
            console.error('Branch not approved - redirecting to StatusScreen');
            navigation.reset({
              index: 0,
              routes: [{name: 'StatusScreen', params: {branchId: idToUse}}],
            });
            return;
          } else {
            // If no ID is available, go to Authentication
            navigation.reset({
              index: 0,
              routes: [{name: 'Authentication'}],
            });
            return;
          }
        }

        let finalUserId = storedUserId || storedBranchId;
        if (storedAccessToken) {
          try {
            // Use our custom TokenPayload type
            const tokenPayload = jwtDecode<TokenPayload>(storedAccessToken);
            console.log('Token Payload:', tokenPayload);

            // Try to get userId or branchId from token
            const tokenId = tokenPayload.userId || tokenPayload.branchId || '';

            if (!tokenId) {
              console.error(
                'No userId or branchId in token - redirecting to login',
              );
              // Clear invalid token data
              storage.delete('userId');
              storage.delete('accessToken');
              navigation.reset({
                index: 0,
                routes: [{name: 'Authentication'}],
              });
              return;
            }

            if (storedUserId && storedUserId !== tokenId) {
              console.warn(
                'Mismatch between stored userId and token id, updating storage',
              );
              finalUserId = tokenId;
              storage.set('userId', finalUserId);
              console.log('Updated MMKV userId to:', finalUserId);
            } else if (!storedUserId) {
              console.log('No stored userId, setting from token');
              finalUserId = tokenId;
              storage.set('userId', finalUserId);
            }
          } catch (e) {
            console.warn('Failed to decode token:', e);
            storage.delete('userId');
            storage.delete('accessToken');
            navigation.reset({
              index: 0,
              routes: [{name: 'Authentication'}],
            });
            return;
          }
        }

        if (finalUserId) {
          socketService.connect(finalUserId);
          fetchOrders(finalUserId);

          // Set state with type safety
          setLocalUserId(finalUserId);
          setAccessToken(storedAccessToken);
          setUserId(finalUserId);
        } else {
          console.error('No finalUserId available after token processing');
          navigation.reset({
            index: 0,
            routes: [{name: 'Authentication'}],
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigation.reset({
          index: 0,
          routes: [{name: 'Authentication'}],
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    return () => {
      socketService.disconnect();
      console.log('HomeScreen unmounted, socket disconnected');
    };
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

  const handleAssignDeliveryPartner = useCallback(
    (order: any) => {
      navigation.navigate('AssignDeliveryPartner', {order});
    },
    [navigation],
  );

  if (isLoading) {
    return <Text>Loading authentication...</Text>;
  }

  if (!userId || !accessToken) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} showStoreStatus />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to the Dashboard!</Text>
        <FlatList
          data={orders.filter(
            o =>
              o.status !== 'delivered' &&
              o.status !== 'cancelled' &&
              o.status !== 'packed' &&
              o.status !== 'assigned',
          )}
          renderItem={({item}) => (
            <OrderCard
              order={item}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancelItem={handleCancelItem}
              onAssignDeliveryPartner={() => handleAssignDeliveryPartner(item)}
              navigation={navigation}
            />
          )}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.orderList}
        />
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('MainPackedScreen')}
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
  orderCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderTitle: {fontWeight: 'bold', fontSize: 16},
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#28a745',
    color: '#fff',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
    marginRight: 10,
  },
  buttonText: {color: '#fff'},
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
