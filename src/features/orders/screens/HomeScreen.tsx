import React, {useEffect, useCallback, useState, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import {storage} from '../../../utils/storage';
import Header from '../../../components/dashboard/Header';
import OrderCard from '../../../components/order/OrderCard';
import LowBalanceModal from '../../../components/common/LowBalanceModal';
import {useStore, Order} from '../../../store/ordersStore';
import api from '../../../services/api';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/types';
import {DrawerNavigationProp} from '@react-navigation/drawer';
import {jwtDecode} from 'jwt-decode';
import LottieView from 'lottie-react-native';
import Sound from 'react-native-sound';
import {
  OrderSocket,
  OrderSocketEventEmitter,
  OrderSocketEvents,
} from '../../../native/OrderSocket';
import {FloatingOverlay} from '../../../native/FloatingOverlay';

type HomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'HomeScreen'
> &
  DrawerNavigationProp<any>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

interface TokenPayload {
  userId?: string;
  branchId?: string;
  exp?: number;
  iat?: number;
}

// Initialize Sound
Sound.setCategory('Playback');
let orderSound: Sound | null = null;

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {
    storeStatus,
    orders,
    setStoreStatus,
    setOrders,
    setUserId,
    walletBalance,
  } = useStore();
  const [userId, setLocalUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  // Initialize order ring sound
  useEffect(() => {
    // Load sound file
    orderSound = new Sound(
      require('../../../assets/music/OrderRing.mp3'),
      (error: any) => {
        if (error) {
          console.error('Failed to load order sound:', error);
        } else {
          console.log('Order sound loaded successfully');
          // Set volume
          orderSound?.setVolume(1.0);
        }
      },
    );

    // Clean up on unmount
    return () => {
      if (orderSound) {
        orderSound.release();
        orderSound = null;
      }
    };
  }, []);

  // Function to play order sound
  const playOrderSound = useCallback(() => {
    if (orderSound) {
      // Reset sound to beginning (in case it was played before)
      orderSound.stop();
      // Play the sound
      orderSound.play((success: boolean) => {
        if (!success) {
          console.error('Sound playback failed');
        }
      });
    }
  }, []);

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

  // Update the setOrders call to handle duplicates
  const setOrdersWithDuplicateCheck = useCallback(
    (newOrders: Order[]) => {
      setOrders((prevOrders: Order[]) => {
        const uniqueNewOrders = newOrders.filter(
          (order, index, self) =>
            index === self.findIndex(o => o._id === order._id),
        );

        if (uniqueNewOrders.length < newOrders.length) {
          console.log(
            'Removed',
            newOrders.length - uniqueNewOrders.length,
            'internal duplicate orders',
          );
        }

        if (prevOrders.length === 0) {
          console.log('Initial load of', uniqueNewOrders.length, 'orders');
          return uniqueNewOrders;
        } else {
          const currentOrderIds = new Set(prevOrders.map(o => o._id));
          const updatedOrders = [...prevOrders];

          let newOrdersAdded = 0;

          uniqueNewOrders.forEach(order => {
            if (!currentOrderIds.has(order._id)) {
              updatedOrders.push(order);
              newOrdersAdded++;
              console.log(
                'Adding order via setOrders:',
                order._id,
                'orderId:',
                order.orderId,
              );
            }
          });

          if (newOrdersAdded > 0) {
            console.log('Added', newOrdersAdded, 'new orders from API');
          }

          return updatedOrders;
        }
      });
    },
    [setOrders],
  );

  // Update the fetchOrders function to use the new setOrders function
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

        // Update to use the new setOrders function
        setOrdersWithDuplicateCheck(sortedOrders);
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
    [navigation, setOrdersWithDuplicateCheck],
  );

  // Add a refresh function
  const refreshOrders = useCallback(() => {
    if (userId) {
      fetchOrders(userId);
    }
  }, [userId, fetchOrders]);

  // Function to fetch branch data and ensure owner name is stored
  const fetchBranchData = useCallback(async (branchId: string) => {
    try {
      console.log('Fetching branch data for branchId:', branchId);
      const response = await api.get(`/branch/status/${branchId}`);

      if (response.data) {
        // Store important branch information in local storage
        if (response.data.name) {
          storage.set('branchName', response.data.name);
        }

        if (response.data.ownerName) {
          storage.set('ownerName', response.data.ownerName);
        }

        console.log(
          'Branch data fetched successfully and stored in local storage',
        );
      }
    } catch (error: any) {
      console.error(
        'Error fetching branch data:',
        error?.response?.data || error?.message,
      );
      // Non-critical error, don't show alert to user
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

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

            if (finalUserId) {
              // Initial fetch and state setup
              if (isMounted) {
                fetchOrders(finalUserId);
                setLocalUserId(finalUserId);
                setAccessToken(storedAccessToken);
                setUserId(finalUserId);

                // Fetch branch data to ensure owner name is available
                fetchBranchData(finalUserId);
              }
            }
          } catch (error) {
            console.error('Token processing error:', error);
            storage.delete('userId');
            storage.delete('accessToken');
            navigation.reset({
              index: 0,
              routes: [{name: 'Authentication'}],
            });
            return;
          }
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
      isMounted = false;
    };
  }, [navigation, fetchOrders, setUserId]);

  // Separate useEffect for socket listeners
  useEffect(() => {
    if (!userId) return;

    const handleNewOrder = (orderData: any) => {
      try {
        console.log('[Socket] Processing new order:', orderData);
        const order =
          typeof orderData.orderData === 'string'
            ? JSON.parse(orderData.orderData)
            : orderData.orderData;

        // Ensure we have the required fields
        if (!order?._id || !Array.isArray(order?.items) || !order?.createdAt) {
          console.warn('[Socket] Invalid order data received:', order);
          return;
        }

        // Use functional update to ensure we're working with latest state
        setOrders((prevOrders: Order[]) => {
          // Check if order already exists
          const exists = prevOrders.some(o => o._id === order._id);
          if (exists) {
            console.log('[Socket] Order already exists:', order._id);
            return prevOrders;
          }

          // Play order sound when a new order is received
          playOrderSound();

          const newOrders = sortOrdersByFIFO([order, ...prevOrders]);
          console.log('[Socket] Added new order:', order._id);
          return newOrders;
        });
      } catch (error) {
        console.error('[Socket] Error handling new order:', error);
      }
    };

    const handleOrderUpdate = (data: any) => {
      try {
        console.log('[Socket] Processing order update:', data);
        const updatedOrder =
          typeof data.orderData === 'string'
            ? JSON.parse(data.orderData)
            : data.orderData;

        setOrders((prevOrders: Order[]) => {
          const updatedOrders = prevOrders.map((order: Order) =>
            order._id === data.orderId ? {...order, ...updatedOrder} : order,
          );
          const sortedOrders = sortOrdersByFIFO(updatedOrders);
          console.log('[Socket] Updated order:', data.orderId);
          return sortedOrders;
        });
      } catch (error) {
        console.error('[Socket] Error handling order update:', error);
      }
    };

    // Set up socket listeners
    const newOrderSubscription = OrderSocketEventEmitter.addListener(
      OrderSocketEvents.NEW_ORDER,
      handleNewOrder,
    );

    const orderUpdateSubscription = OrderSocketEventEmitter.addListener(
      OrderSocketEvents.ORDER_UPDATE,
      handleOrderUpdate,
    );

    // Set up fallback refresh every 1 minute
    const refreshInterval = setInterval(() => {
      console.log('[Fallback] Checking for new orders...');
      fetchOrders(userId);
    }, 60 * 1000); // 1 minute

    return () => {
      newOrderSubscription.remove();
      orderUpdateSubscription.remove();
      clearInterval(refreshInterval);
      console.log('[Socket] Cleaned up socket listeners and refresh interval');
    };
  }, [userId, sortOrdersByFIFO, fetchOrders]);

  // Memoize the filtered and sorted orders to prevent unnecessary re-renders
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(
      o =>
        o.status !== 'delivered' &&
        o.status !== 'cancelled' &&
        o.status !== 'packed' &&
        o.status !== 'assigned',
    );
    return sortOrdersByFIFO(filtered);
  }, [orders, sortOrdersByFIFO]);

  // Add pull-to-refresh functionality for manual updates
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (userId) {
        await fetchOrders(userId);
      }
    } catch (error) {
      console.error('Manual refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId, fetchOrders]);

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

  // Add a function to handle recharge navigation
  const handleRecharge = useCallback(() => {
    setShowLowBalanceModal(false);
    navigation.navigate('Wallet');
  }, [navigation]);

  // Check wallet balance and show modal if needed
  useEffect(() => {
    if (walletBalance < -100 && storeStatus === 'closed') {
      setShowLowBalanceModal(true);
    }
  }, [walletBalance, storeStatus]);

  // Add new useEffect for floating overlay
  useEffect(() => {
    // Request overlay permission when component mounts
    FloatingOverlay.requestOverlayPermission().catch(error => {
      console.error('Failed to request overlay permission:', error);
    });

    // Set up app state change listener
    const subscription = AppState.addEventListener('change', nextAppState => {
      console.log('App state changed:', nextAppState);
      setAppState(nextAppState);

      // Show overlay when app goes to background and store is open
      if (nextAppState === 'background') {
        const activeOrderCount = filteredOrders.length;
        if (storeStatus === 'open') {
          console.log(
            'App went to background with store open, showing floating overlay',
          );
          FloatingOverlay.showOverlay(true, activeOrderCount);
        } else {
          // Even when store is closed, show overlay if there are orders
          if (activeOrderCount > 0) {
            console.log(
              'App went to background with store closed but has active orders, showing floating overlay',
            );
            FloatingOverlay.showOverlay(false, activeOrderCount);
          } else {
            FloatingOverlay.hideOverlay();
          }
        }
      } else if (nextAppState === 'active') {
        // Hide overlay when app comes to foreground
        console.log('App came to foreground, hiding floating overlay');
        FloatingOverlay.hideOverlay();
      }
    });

    // Clean up on unmount
    return () => {
      subscription.remove();
      FloatingOverlay.hideOverlay();
    };
  }, [storeStatus, filteredOrders.length]);

  // Add another useEffect to update the overlay when orders change
  useEffect(() => {
    if (appState === 'background') {
      const activeOrderCount = filteredOrders.length;
      if (storeStatus === 'open' || activeOrderCount > 0) {
        console.log('Updating overlay with new order count:', activeOrderCount);
        FloatingOverlay.updateOverlay(storeStatus === 'open', activeOrderCount);
      }
    }
  }, [filteredOrders.length, appState, storeStatus]);

  if (isLoading) {
    return <Text>Loading authentication...</Text>;
  }

  if (!userId || !accessToken) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Header
        navigation={navigation}
        showStoreStatus
        setShowLowBalanceModal={setShowLowBalanceModal}
      />
      {storeStatus === 'closed' ? (
        <View style={styles.closedContainer}>
          <LottieView
            source={require('../../../assets/animations/Closed.json')}
            autoPlay
            loop
            style={styles.closedAnimation}
          />
          <Text style={styles.closedText}>Store is currently closed</Text>
          <Text style={styles.closedSubtext}>
            Open your store to receive new orders
          </Text>
        </View>
      ) : (
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
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyOrdersContainer}>
              <LottieView
                source={require('../../../assets/animations/open.json')}
                autoPlay
                loop
                style={styles.openAnimation}
              />

              <Text style={styles.noOrdersSubtext}>
                Your store is open and ready to receive orders
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              renderItem={({item}) => (
                <OrderCard
                  order={item}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onCancelItem={handleCancelItem}
                  onAssignDeliveryPartner={() =>
                    handleAssignDeliveryPartner(item)
                  }
                  navigation={navigation}
                  onPress={() =>
                    navigation.navigate('OrderDetail', {order: item})
                  }
                />
              )}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.orderList}
              onRefresh={handleRefresh}
              refreshing={isRefreshing}
            />
          )}
        </View>
      )}
      <TouchableOpacity
        onPress={() => navigation.navigate('MainPackedScreen')}
        style={styles.packedOrderButton}>
        <Text style={styles.packedOrderButtonText}>Packed Order</Text>
      </TouchableOpacity>

      <LowBalanceModal
        visible={showLowBalanceModal}
        onRecharge={handleRecharge}
        onCancel={() => setShowLowBalanceModal(false)}
      />
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
  emptyOrdersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  openAnimation: {
    width: 200,
    height: 200,
  },
  noOrdersText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  noOrdersSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
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
  closedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closedAnimation: {
    width: 200,
    height: 200,
  },
  closedText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    textAlign: 'center',
  },
  closedSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default HomeScreen;
