import 'react-native-gesture-handler';
import React, {useEffect, useCallback} from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import {useStore} from './src/store/ordersStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OrderSocket,
  OrderSocketEventEmitter,
  OrderSocketEvents,
} from './src/native/OrderSocket';

export const navigationRef = React.createRef<NavigationContainerRef<any>>();

const App = () => {
  const {
    userId,
    setUserId,
    addOrder,
    updateOrder,
    setWalletBalance,
    addWalletTransaction,
  } = useStore();

  const handleNewOrder = useCallback(
    (orderData: any) => {
      console.log('New order received:', orderData);
      try {
        const order = JSON.parse(orderData.orderData);
        addOrder(order);
      } catch (error) {
        console.error('Error parsing new order:', error);
      }
    },
    [addOrder],
  );

  const handleOrderUpdate = useCallback(
    (data: any) => {
      console.log('Order update received:', data);
      try {
        const order = JSON.parse(data.orderData);
        updateOrder(data.orderId, order);
      } catch (error) {
        console.error('Error parsing order update:', error);
      }
    },
    [updateOrder],
  );

  const handleWalletUpdate = useCallback(
    (data: any) => {
      try {
        const {newBalance, transaction} = data;
        setWalletBalance(newBalance);
        if (transaction) {
          const parsedTransaction = JSON.parse(transaction);
          addWalletTransaction({
            ...parsedTransaction,
            timestamp: parsedTransaction.timestamp,
            status:
              parsedTransaction.type === 'platform_charge'
                ? 'settled'
                : 'pending',
            orderNumber: parsedTransaction.orderId,
          });
        }
      } catch (error) {
        console.error('Error handling wallet update:', error);
      }
    },
    [setWalletBalance, addWalletTransaction],
  );

  useEffect(() => {
    const restoreUserId = async () => {
      try {
        const storedBranchId = await AsyncStorage.getItem('branchId');
        const token = await AsyncStorage.getItem('accessToken');
        console.log('Restoring userId from AsyncStorage:', storedBranchId);
        if (storedBranchId && token && !userId) {
          setUserId(storedBranchId);
          // Initialize socket connection with token
          try {
            await OrderSocket.connect(storedBranchId, token);
            console.log('Native socket connected with userId:', storedBranchId);
            const recentOrders = await OrderSocket.getRecentOrders(
              storedBranchId,
            );
            console.log('Fetched recent orders:', recentOrders);
            recentOrders.forEach(order => {
              try {
                const parsedOrder = JSON.parse(order.orderData);
                addOrder(parsedOrder);
              } catch (error) {
                console.error('Error parsing stored order:', error);
              }
            });
          } catch (error) {
            console.error('Failed to connect socket or fetch orders:', error);
          }
        }
      } catch (error) {
        console.error('Failed to restore userId from AsyncStorage:', error);
      }
    };
    restoreUserId();
  }, [userId, setUserId, addOrder]);

  useEffect(() => {
    const newOrderSubscription = OrderSocketEventEmitter.addListener(
      OrderSocketEvents.NEW_ORDER,
      handleNewOrder,
    );

    const orderUpdateSubscription = OrderSocketEventEmitter.addListener(
      OrderSocketEvents.ORDER_UPDATE,
      handleOrderUpdate,
    );

    const walletUpdateSubscription = OrderSocketEventEmitter.addListener(
      'walletUpdated',
      handleWalletUpdate,
    );

    return () => {
      newOrderSubscription.remove();
      orderUpdateSubscription.remove();
      walletUpdateSubscription.remove();
      if (userId) {
        OrderSocket.disconnect().catch(console.error);
      }
    };
  }, [userId, handleNewOrder, handleOrderUpdate, handleWalletUpdate]);

  return (
    <NavigationContainer ref={navigationRef}>
      <AppNavigator />
    </NavigationContainer>
  );
};

export default App;
