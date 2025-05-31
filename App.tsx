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
import NetworkAlert from './src/components/common/NetworkAlert';

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
      try {
        const order = JSON.parse(orderData.orderData);
        addOrder(order);
      } catch (error) {
        console.error('[Socket] Error parsing new order:', error);
      }
    },
    [addOrder],
  );

  const handleOrderUpdate = useCallback(
    (data: any) => {
      try {
        const order = JSON.parse(data.orderData);
        updateOrder(data.orderId, order);
      } catch (error) {
        console.error('[Socket] Error parsing order update:', error);
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
        console.error('[Socket] Error handling wallet update:', error);
      }
    },
    [setWalletBalance, addWalletTransaction],
  );

  useEffect(() => {
    let isInitialConnection = true;

    const restoreUserId = async () => {
      try {
        const storedBranchId = await AsyncStorage.getItem('branchId');
        const token = await AsyncStorage.getItem('accessToken');

        if (storedBranchId && token && !userId) {
          setUserId(storedBranchId);

          // Only connect socket and fetch orders on initial mount
          if (isInitialConnection) {
            try {
              await OrderSocket.connect(storedBranchId, token);
              const recentOrders = await OrderSocket.getRecentOrders(
                storedBranchId,
              );

              recentOrders.forEach(order => {
                try {
                  const parsedOrder = JSON.parse(order.orderData);
                  addOrder(parsedOrder);
                } catch (error) {
                  console.error('[Socket] Error parsing stored order:', error);
                }
              });
            } catch (error) {
              console.error(
                '[Socket] Failed to connect or fetch orders:',
                error,
              );
            }
            isInitialConnection = false;
          }
        }
      } catch (error) {
        console.error('[Socket] Failed to restore userId:', error);
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
      {/* Add NetworkAlert component for internet connectivity monitoring */}
      <NetworkAlert />
    </NavigationContainer>
  );
};

export default App;
