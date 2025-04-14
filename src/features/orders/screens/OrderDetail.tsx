import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import UniversalAdd from '../../../components/common/UniversalAdd';
import api from '../../../services/api';
import {useStore, Order} from '../../../store/ordersStore';
import socketService from '../../../services/socket';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Item {
  _id: string;
  name: string;
  price: number;
}

// Extended Order type with deliveryEnabled property which exists at runtime
interface ExtendedOrder extends Order {
  deliveryEnabled?: boolean;
}

interface OrderDetailProps
  extends StackScreenProps<RootStackParamList, 'OrderDetail'> {}

const OrderDetail: React.FC<OrderDetailProps> = ({route, navigation}) => {
  const {order: initialOrder, fromPackedTab} = route.params || {};
  const {updateOrder, orders} = useStore();
  const currentOrder = (orders.find(o => o._id === initialOrder._id) ||
    initialOrder) as ExtendedOrder;
  const [updatedItems, setUpdatedItems] = useState(currentOrder.items);
  const [hasModified, setHasModified] = useState(false);
  const [totalAmountState, setTotalAmountState] = useState(
    currentOrder.totalPrice || 0,
  );
  const [loading, setLoading] = useState(false);

  // Fetch detailed order data if price or totalPrice is missing
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/orders/${currentOrder._id}`);
        setUpdatedItems(response.data.items);
        setTotalAmountState(response.data.totalPrice || 0);
      } catch (error: any) {
        console.error('Fetch Order Details Error:', error);
        Alert.alert('Error', 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    // Check if price or totalPrice is missing
    if (
      !currentOrder.items.some(i => i.item.price) ||
      !currentOrder.totalPrice
    ) {
      fetchDetails();
    } else {
      setUpdatedItems(currentOrder.items);
      setTotalAmountState(currentOrder.totalPrice || 0);
    }
  }, [currentOrder]);

  // Socket connection for customer
  useEffect(() => {
    const customerId = currentOrder.customer || '67b4dd5abe2479aa2cfe45a0';
    socketService.connectCustomer(customerId, updateOrder);
    return () => socketService.disconnect();
  }, [currentOrder.customer]);

  // Update total amount when items are modified
  useEffect(() => {
    const newTotal = updatedItems.reduce((sum, item) => {
      return sum + item.item.price * item.count;
    }, 0);
    setTotalAmountState(newTotal);
  }, [updatedItems]);

  // Check for modifications
  useEffect(() => {
    const isModified = updatedItems.some((updatedItem, index) => {
      const originalItem = initialOrder.items[index];
      return updatedItem.count !== originalItem.count;
    });
    setHasModified(isModified);
  }, [updatedItems, initialOrder.items]);

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

  const handleCancelOrder = async () => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const response = await api.patch(
              `/orders/${currentOrder._id}/cancel`,
            );
            updateOrder(currentOrder._id, response.data);
            navigation.goBack();
          } catch (error: any) {
            console.error('Cancel Order Error:', error);
            Alert.alert('Error', 'Failed to cancel order');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleAccept = async () => {
    try {
      setLoading(true);
      await api.patch(`/orders/${currentOrder._id}/accept`);
      const updatedOrder = {...currentOrder, status: 'accepted'};
      updateOrder(currentOrder._id, updatedOrder);
    } catch (error: any) {
      console.error('Accept Order Error:', error);
      Alert.alert('Error', 'Failed to accept order');
    } finally {
      setLoading(false);
    }
  };

  const handleModifyOrder = async () => {
    Alert.alert(
      'Modify Order',
      'After modifying this order, you will not be able to modify it again.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Modify',
          onPress: async () => {
            try {
              setLoading(true);
              if (currentOrder.status !== 'accepted') {
                await handleAccept();
              }
              const modifiedItems = updatedItems.map(item => ({
                item: (item.item as Item)._id || item.item,
                count: item.count,
              }));

              await api.patch(`/orders/${currentOrder._id}/modify`, {
                modifiedItems,
                totalPrice: totalAmountState,
              });
              setHasModified(false);

              // Update order with a flag to prevent further modifications
              updateOrder(currentOrder._id, {
                ...currentOrder,
                items: updatedItems,
                totalPrice: totalAmountState,
                modificationLocked: true,
              });

              // Show success message
              Alert.alert(
                'Order Modified',
                'Order has been modified successfully. No further modifications are allowed.',
              );
            } catch (error: any) {
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
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handlePackedOrder = async () => {
    try {
      setLoading(true);
      if (currentOrder.status !== 'accepted') {
        await handleAccept();
      }
      const response = await api.patch(`/orders/${currentOrder._id}/pack`);
      const updatedOrder = response.data as ExtendedOrder;
      updateOrder(currentOrder._id, updatedOrder);

      // Navigate based on deliveryEnabled after packing
      if (updatedOrder.deliveryEnabled) {
        console.log('Navigating to AssignDeliveryPartner:', updatedOrder);
        navigation.replace('AssignDeliveryPartner', {order: updatedOrder});
      } else {
        // Show success message for orders with deliveryEnabled = false
        Alert.alert(
          'Order Packed',
          'Customer has been notified that their order is packed and ready.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.replace('OrderHasPacked', {order: updatedOrder}),
            },
          ],
        );
      }
    } catch (error: any) {
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
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
        return '#FF9800';
      case 'accepted':
        return '#5E60CE';
      case 'packed':
        return '#00BFA6';
      case 'cancelled':
        return '#F43F5E';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed':
        return 'receipt';
      case 'accepted':
        return 'check-circle';
      case 'packed':
        return 'inventory';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help';
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyList}>
      <Icon name="shopping-bag" size={50} color="#ccc" />
      <Text style={styles.emptyListText}>No items in this order</Text>
    </View>
  );

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderText}>Order Items</Text>
      <Text style={styles.itemCountText}>{updatedItems.length} items</Text>
    </View>
  );

  const renderItemSeparator = () => <View style={styles.itemSeparator} />;

  const canModifyOrder =
    currentOrder.status !== 'packed' &&
    !currentOrder.modificationLocked &&
    hasModified;

  const canPackOrder =
    currentOrder.status !== 'packed' &&
    (!hasModified || currentOrder.modificationLocked);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Order #{currentOrder.orderId}</Text>
            <View style={styles.statusContainer}>
              <Icon
                name={getStatusIcon(currentOrder.status)}
                size={14}
                color={getStatusColor(currentOrder.status)}
                style={styles.statusIcon}
              />
              <Text
                style={[
                  styles.statusText,
                  {color: getStatusColor(currentOrder.status)},
                ]}>
                {currentOrder.status.charAt(0).toUpperCase() +
                  currentOrder.status.slice(1)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleCancelOrder}
            style={styles.cancelButton}>
            <Icon name="close" size={20} color="#FF4D4F" />
          </TouchableOpacity>
        </View>

        {/* Order Items */}
        <FlatList
          data={updatedItems}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyList}
          ItemSeparatorComponent={renderItemSeparator}
          renderItem={({item}) => (
            <View style={styles.itemRow}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.item.name}</Text>
                <Text style={styles.itemPrice}>₹{item.item.price}</Text>
              </View>

              <View style={styles.quantityContainer}>
                {currentOrder.status !== 'packed' &&
                !currentOrder.modificationLocked ? (
                  <UniversalAdd
                    item={item}
                    count={getItemCount}
                    addItem={addItem}
                    removeItem={removeItem}
                  />
                ) : (
                  <View style={styles.quantityBadge}>
                    <Text style={styles.quantityText}>
                      {getItemCount(item._id)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
        />

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Total</Text>
            <Text style={styles.summaryValue}>
              ₹{totalAmountState.toFixed(2)}
            </Text>
          </View>

          {currentOrder.amount?.delivery ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>
                ₹{currentOrder.amount.delivery.toFixed(2)}
              </Text>
            </View>
          ) : null}

          {currentOrder.amount?.tax ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>
                ₹{currentOrder.amount.tax.toFixed(2)}
              </Text>
            </View>
          ) : null}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              ₹
              {(
                totalAmountState +
                (currentOrder.amount?.delivery || 0) +
                (currentOrder.amount?.tax || 0)
              ).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Modification Note */}
        {currentOrder.modificationLocked &&
          currentOrder.status !== 'packed' && (
            <View style={styles.note}>
              <Icon
                name="info"
                size={16}
                color="#5E60CE"
                style={styles.noteIcon}
              />
              <Text style={styles.noteText}>
                This order has been modified and cannot be modified again.
              </Text>
            </View>
          )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {currentOrder.status === 'packed' &&
          currentOrder.deliveryEnabled &&
          !fromPackedTab ? (
            <TouchableOpacity
              onPress={() => {
                console.log(
                  'Navigating to AssignDeliveryPartner:',
                  currentOrder,
                );
                navigation.navigate('AssignDeliveryPartner', {
                  order: currentOrder,
                });
              }}
              style={styles.primaryButton}>
              <Icon
                name="local-shipping"
                size={20}
                color="#fff"
                style={styles.buttonIcon}
              />
              <Text style={styles.buttonText}>Assign Delivery Partner</Text>
            </TouchableOpacity>
          ) : (
            <>
              {canModifyOrder && (
                <TouchableOpacity
                  onPress={handleModifyOrder}
                  disabled={loading}
                  style={[
                    styles.modifyButton,
                    loading && styles.disabledButton,
                  ]}>
                  <Icon
                    name="edit"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>Modify Order</Text>
                </TouchableOpacity>
              )}

              {canPackOrder && (
                <TouchableOpacity
                  onPress={handlePackedOrder}
                  disabled={loading}
                  style={[
                    styles.primaryButton,
                    loading && styles.disabledButton,
                  ]}>
                  <Icon
                    name="inventory-2"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.buttonText}>Mark as Packed</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEEEE',
    backgroundColor: '#FFF5F5',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  itemCountText: {
    fontSize: 14,
    color: '#6B7280',
  },
  list: {
    backgroundColor: '#ffffff',
    flexGrow: 1,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#6B7280',
  },
  quantityContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  quantityBadge: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  itemSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyListText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  summary: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3FF',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  noteIcon: {
    marginRight: 8,
  },
  noteText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  actionsContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  primaryButton: {
    backgroundColor: '#5E60CE',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modifyButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default OrderDetail;
