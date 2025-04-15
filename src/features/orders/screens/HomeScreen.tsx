import React, {useEffect, useCallback, useState} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {storage} from '../../../utils/storage';
import socketService from '../../../services/socket';
import Header from '../../../components/dashboard/Header';
import OrderCard from '../../../components/order/OrderCard';
import {useStore, Order} from '../../../store/ordersStore';
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Add a function to sort orders by ID in FIFO order
  const sortOrdersByFIFO = useCallback((ordersToSort: Order[]) => {
    try {
      return [...ordersToSort].sort((a, b) => {
        // Sort by creation timestamp first
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime; // Ascending order (FIFO)
      });
    } catch (error) {
      console.error('Error sorting orders:', error);
      return ordersToSort; // Return unsorted array if sorting fails
    }
  }, []);

  const fetchOrders = useCallback(
    async (branchId: string) => {
      try {
        console.log('Fetching orders for branchId:', branchId);

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

        console.log('Using token for fetch:', token.substring(0, 10) + '...');

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

        if (!response?.data) {
          console.error('No data received from orders API');
          return;
        }

        console.log(
          'Orders fetched successfully:',
          response.data?.length || 0,
          'orders',
        );

        // Validate and clean the orders data
        const validOrders = response.data.filter((order: any) => {
          // Check for minimum required fields
          if (!order?._id) {
            console.warn('Order missing _id:', order);
            return false;
          }

          // Check if order has items
          if (!Array.isArray(order?.items)) {
            console.warn('Order has no items array:', order._id);
            return false;
          }

          // Check if order has required timestamps
          if (!order?.createdAt) {
            console.warn('Order missing createdAt:', order._id);
            return false;
          }

          return true;
        });

        // Sort orders before setting them
        const sortedOrders = sortOrdersByFIFO(validOrders);
        console.log(
          'Setting sorted orders:',
          sortedOrders.map(o => ({
            id: o._id,
            created: o.createdAt,
            status: o.status,
          })),
        );
        setOrders(sortedOrders);
      } catch (error: any) {
        console.error(
          'Fetch Orders Error:',
          error?.response?.status,
          error?.response?.data || error?.message || error,
        );

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
    [setOrders, navigation, sortOrdersByFIFO],
  );

  // Add a refresh function
  const refreshOrders = useCallback(() => {
    if (userId) {
      fetchOrders(userId);
    }
  }, [userId, fetchOrders]);

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
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
            const tokenPayload = jwtDecode<TokenPayload>(storedAccessToken);
            console.log('Token Payload:', tokenPayload);

            const tokenId = tokenPayload.userId || tokenPayload.branchId || '';

            if (!tokenId) {
              console.error(
                'No userId or branchId in token - redirecting to login',
              );
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
          // Setup socket connection and event handlers
          socketService.connect(finalUserId, {
            setWalletBalance: () => {}, // Not needed for orders
            addWalletTransaction: () => {}, // Not needed for orders
          });

          // Listen for new orders
          const socket = socketService.getSocket();
          if (socket) {
            socket.on('newOrder', (orderData: any) => {
              console.log('New order received in HomeScreen:', orderData);
              try {
                const order =
                  typeof orderData === 'string'
                    ? JSON.parse(orderData)
                    : orderData;
                const newOrder = order as Order;
                // Sort orders after adding the new one
                const updatedOrders = sortOrdersByFIFO([newOrder, ...orders]);
                console.log(
                  'Updating orders with new order:',
                  newOrder.orderID,
                );
                setOrders(updatedOrders);
              } catch (error) {
                console.error('Error handling new order:', error);
              }
            });

            // Listen for order updates
            socket.on(
              'orderUpdated',
              ({
                orderId,
                ...updatedData
              }: {
                orderId: string;
                [key: string]: any;
              }) => {
                console.log(
                  'Order update received in HomeScreen:',
                  orderId,
                  updatedData,
                );
                const updatedOrders = orders.map((order: Order) =>
                  order._id === orderId ? {...order, ...updatedData} : order,
                );
                // Sort orders after updating
                const sortedOrders = sortOrdersByFIFO(updatedOrders);
                setOrders(sortedOrders);
              },
            );
          }

          fetchOrders(finalUserId);
          setLocalUserId(finalUserId);
          setAccessToken(storedAccessToken);
          setUserId(finalUserId);

          // Set up periodic refresh
          refreshInterval = setInterval(() => {
            if (finalUserId) {
              fetchOrders(finalUserId);
            }
          }, 30000); // Refresh every 30 seconds
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
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('newOrder');
        socket.off('orderUpdated');
      }
      socketService.disconnect();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      console.log(
        'HomeScreen unmounted, socket disconnected and events cleaned up',
      );
    };
  }, [navigation, fetchOrders, setUserId, orders, sortOrdersByFIFO]);

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

  const navigateToSalesSummary = useCallback(() => {
    setIsRefreshing(true);
    // Simulate a refresh process before navigation
    setTimeout(() => {
      setIsRefreshing(false);
      navigation.navigate('SalesSummary');
    }, 800);
  }, [navigation]);

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
        <View style={styles.titleRow}>
          <Text style={styles.title}>Check Today's Sales</Text>
          <TouchableOpacity
            style={styles.viewButton}
            disabled={isRefreshing}
            onPress={navigateToSalesSummary}>
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.viewButtonText}>View</Text>
            )}
          </TouchableOpacity>
        </View>
        <FlatList
          data={sortOrdersByFIFO(
            orders.filter(
              o =>
                o.status !== 'delivered' &&
                o.status !== 'cancelled' &&
                o.status !== 'packed' &&
                o.status !== 'assigned',
            ),
          )}
          renderItem={({item}) => (
            <OrderCard
              order={item}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancelItem={handleCancelItem}
              onAssignDeliveryPartner={() => handleAssignDeliveryPartner(item)}
              navigation={navigation}
              onPress={() => navigation.navigate('OrderDetail', {order: item})}
            />
          )}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.orderList}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchOrders(userId || '').finally(() => setIsRefreshing(false));
          }}
          refreshing={isRefreshing}
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
  container: {flex: 1, backgroundColor: '#f8f8f8'},
  content: {padding: 20, flex: 1},
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {fontSize: 20, color: '#333'},
  viewButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
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
