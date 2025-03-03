import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import UniversalAdd from '../components/ui/UniversalAdd';
import api from '../services/api';
import {useStore} from '../store/ordersStore';
import socketService from '../services/socket';

type OrderDetailProps = StackScreenProps<RootStackParamList, 'OrderDetail'>;

const OrderDetail: React.FC<OrderDetailProps> = ({route, navigation}) => {
  const {order: initialOrder, fromPackedTab} = route.params || {}; // Added fromPackedTab
  const {updateOrder, orders} = useStore();
  const currentOrder =
    orders.find(o => o._id === initialOrder._id) || initialOrder;
  const [updatedItems, setUpdatedItems] = useState(currentOrder.items);
  const [hasModified, setHasModified] = useState(false);
  const [totalAmountState, setTotalAmountState] = useState(
    currentOrder.items.reduce(
      (sum, item) =>
        sum + Number(item.item.price || 0) * Number(item.count || 0),
      0,
    ),
  );

  useEffect(() => {
    const customerId = currentOrder.customer || '67b4dd5abe2479aa2cfe45a0'; // Replace with dynamic source
    socketService.connectCustomer(customerId);
    return () => socketService.disconnect();
  }, [currentOrder.customer]);

  useEffect(() => {
    console.log('Initial order.items:', currentOrder.items);
  }, []);

  useEffect(() => {
    console.log('Updated currentOrder:', currentOrder);
    setUpdatedItems(currentOrder.items);
    const newTotal = currentOrder.items.reduce(
      (sum, item) =>
        sum + Number(item.item.price || 0) * Number(item.count || 0),
      0,
    );
    setTotalAmountState(newTotal);
  }, [currentOrder]);

  const getItemCount = (itemId: string) =>
    updatedItems.find(i => i._id === itemId)?.count || 0;

  const addItem = (item: any) => {
    setUpdatedItems(prev =>
      prev.map(i =>
        i._id === item._id
          ? {
              ...i,
              count: Math.min(
                i.count + 1,
                initialOrder.items.find(o => o._id === i._id)?.count || i.count,
              ),
            }
          : i,
      ),
    );
  };

  const removeItem = (itemId: string) => {
    setUpdatedItems(prev =>
      prev.map(i =>
        i._id === itemId ? {...i, count: Math.max(0, i.count - 1)} : i,
      ),
    );
  };

  useEffect(() => {
    const isModified = updatedItems.some((updatedItem, index) => {
      const originalItem = initialOrder.items[index];
      return updatedItem.count !== originalItem.count;
    });
    setHasModified(isModified);
  }, [updatedItems, initialOrder.items]);

  const handleCancelOrder = async () => {
    try {
      const response = await api.patch(`/orders/${currentOrder._id}/cancel`);
      updateOrder(currentOrder._id, response.data);
      navigation.goBack();
    } catch (error) {
      console.error('Cancel Order Error:', error);
      Alert.alert('Error', 'Failed to cancel order');
    }
  };

  const handleAccept = async () => {
    try {
      await api.patch(`/orders/${currentOrder._id}/accept`);
      const updatedOrder = {...currentOrder, status: 'accepted'};
      updateOrder(currentOrder._id, updatedOrder);
    } catch (error) {
      console.error('Accept Order Error:', error);
      Alert.alert('Error', 'Failed to accept order');
    }
  };

  const handleModifyOrder = async () => {
    try {
      if (currentOrder.status !== 'accepted') {
        console.log('Accepting order before modifying:', currentOrder._id);
        await handleAccept();
      }
      const modifiedItems = updatedItems.map(item => ({
        item: item.item._id || item.item,
        count: item.count,
      }));
      console.log('Sending modify request:', {
        orderId: currentOrder._id,
        modifiedItems,
      });
      await api.patch(`/orders/${currentOrder._id}/modify`, {modifiedItems});
      setHasModified(false);
      updateOrder(currentOrder._id, {...currentOrder, items: updatedItems});
    } catch (error) {
      console.error(
        'Modify Order Error:',
        error.response?.data || error.message,
      );
      Alert.alert(
        'Error',
        `Failed to modify order: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  };

  const handlePackedOrder = async () => {
    try {
      if (currentOrder.status !== 'accepted') {
        console.log('Accepting order before packing:', currentOrder._id);
        await handleAccept();
      }
      console.log('Sending pack request:', {orderId: currentOrder._id});
      const response = await api.patch(`/orders/${currentOrder._id}/pack`);
      console.log('Pack successful:', response.data);
      updateOrder(currentOrder._id, response.data);
    } catch (error) {
      console.error(
        'Packed Order Error:',
        error.response?.data || error.message,
      );
      Alert.alert(
        'Error',
        `Failed to pack order: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  };

  const handleCollectCash = async () => {
    try {
      const response = await api.patch(
        `/orders/${currentOrder._id}/collect-cash`,
      );
      console.log('Cash collected:', response.data);
      updateOrder(currentOrder._id, {...currentOrder, status: 'completed'}); // Assume completed status
      Alert.alert('Success', 'Cash collected successfully');
      navigation.goBack();
    } catch (error) {
      console.error(
        'Collect Cash Error:',
        error.response?.data || error.message,
      );
      Alert.alert(
        'Error',
        `Failed to collect cash: ${
          error.response?.data?.message || error.message
        }`,
      );
    }
  };

  useEffect(() => {
    if (
      currentOrder.status === 'packed' &&
      !currentOrder.deliveryServiceAvailable &&
      !fromPackedTab
    ) {
      navigation.navigate('OrderHasPacked', {order: currentOrder});
    }
  }, [
    currentOrder.status,
    currentOrder.deliveryServiceAvailable,
    navigation,
    fromPackedTab,
  ]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Order #{currentOrder.orderId}</Text>
        <TouchableOpacity
          onPress={handleCancelOrder}
          style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={updatedItems}
        renderItem={({item}) => (
          <View style={styles.itemRow}>
            <View style={styles.itemDetails}>
              <Text>{item.item.name}</Text>
              <Text>
                ₹{item.item.price} x {getItemCount(item._id)}
              </Text>
            </View>
            {currentOrder.status !== 'packed' && (
              <UniversalAdd
                item={item}
                count={getItemCount}
                addItem={addItem}
                removeItem={removeItem}
              />
            )}
          </View>
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
      />
      {currentOrder.modificationHistory?.length > 0 && (
        <View style={styles.changesContainer}>
          <Text style={styles.changesTitle}>Changes:</Text>
          {currentOrder.modificationHistory[0].changes.map((change, index) => (
            <Text key={index} style={styles.changeText}>
              {change}
            </Text>
          ))}
        </View>
      )}
      <Text style={styles.total}>Total Amount: ₹{totalAmountState}</Text>
      {currentOrder.status === 'packed' &&
      currentOrder.deliveryServiceAvailable &&
      !fromPackedTab ? (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('AssignDeliveryPartner', {order: currentOrder})
          }
          style={styles.deliveryButton}>
          <Text style={styles.deliveryButtonText}>Delivery Assign</Text>
        </TouchableOpacity>
      ) : (
        currentOrder.status !== 'packed' && (
          <TouchableOpacity
            onPress={hasModified ? handleModifyOrder : handlePackedOrder}
            style={[
              styles.packButton,
              {backgroundColor: hasModified ? '#007AFF' : '#28a745'},
            ]}>
            <Text style={styles.packButtonText}>
              {hasModified ? 'Modify Order' : 'Packed Order'}
            </Text>
          </TouchableOpacity>
        )
      )}
      {currentOrder.status === 'packed' && fromPackedTab && (
        <TouchableOpacity
          onPress={handleCollectCash}
          style={styles.collectCashButton}>
          <Text style={styles.collectCashButtonText}>Collect Cash</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#f5f5f5'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {fontSize: 24, fontWeight: '700', color: '#333'},
  cancelButton: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  cancelButtonText: {color: '#fff', fontSize: 14, fontWeight: '600'},
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  itemDetails: {flex: 1},
  list: {paddingBottom: 20},
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'right',
    color: '#333',
  },
  packButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  packButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  changesContainer: {marginVertical: 10},
  changesTitle: {fontSize: 16, fontWeight: 'bold', color: '#333'},
  changeText: {fontSize: 14, color: '#555'},
  deliveryButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  deliveryButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
  collectCashButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  collectCashButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
});

export default OrderDetail;
