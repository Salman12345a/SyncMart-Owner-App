import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // For delivery icon
import api from '../../services/api';

const OrderCard = ({
  order: initialOrder,
  onAccept,
  onReject,
  onCancelItem,
  onAssignDeliveryPartner,
  navigation,
  onPress,
}) => {
  const [order, setOrder] = useState(initialOrder);

  // Fetch order details if item names or prices are missing
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await api.get(`/orders/${initialOrder._id}`);
        console.log(
          'Fetched OrderCard Data:',
          JSON.stringify(response.data, null, 2),
        );
        setOrder(response.data);
      } catch (error) {
        console.error('Fetch OrderCard Error:', error);
      }
    };

    // Check if any item lacks name or price
    if (
      !initialOrder.items ||
      initialOrder.items.some(item => !item.item?.name || !item.item?.price)
    ) {
      fetchOrderDetails();
    }
  }, [initialOrder._id]);

  const handleAccept = async () => {
    await api.patch(`/orders/${order._id}/accept`);
    onAccept(order._id);
  };

  const handleReject = async () => {
    await api.patch(`/orders/${order._id}/cancel`, {
      reason: 'item unavailable',
    });
    onReject(order._id);
  };

  const handleCancelItem = async (itemId: string) => {
    await api.patch(`/orders/${order._id}/cancel-item/${itemId}`);
    onCancelItem(order._id, itemId);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('OrderDetail', {order});
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'placed':
        return styles.statusPlaced;
      case 'accepted':
        return styles.statusAccepted;
      case 'packed':
        return styles.statusPacked;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return styles.statusDefault;
    }
  };

  // Log order.items for debugging
  console.log('OrderCard order:', order);
  console.log('OrderCard items:', order?.items);

  // Ensure items exist before slicing, default to empty array if not
  const displayedItems = (order?.items || []).slice(0, 2);

  return (
    <TouchableOpacity onPress={handlePress} style={styles.card}>
      <Text style={styles.orderId}>Order ID: {order.orderId}</Text>
      {displayedItems.length > 0 ? (
        displayedItems.map(item => (
          <View key={item._id} style={styles.item}>
            <Text style={styles.itemText}>
              {item.item?.name || 'Unknown Item'} x {item.count || 0}
            </Text>
            <Text style={styles.priceText}>
              ₹
              {item.item?.price
                ? (item.item.price * (item.count || 0)).toFixed(2)
                : '0.00'}
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.noItemsText}>No items available</Text>
      )}
      {order.items && order.items.length > 2 && (
        <Text style={styles.moreItemsText}>
          +{order.items.length - 2} more item
          {order.items.length - 2 > 1 ? 's' : ''}
        </Text>
      )}
      <View style={styles.footerContainer}>
        {order.deliveryEnabled && (
          <Icon
            name="delivery-dining"
            size={20}
            color="#007AFF"
            style={styles.deliveryIcon}
          />
        )}
        <View style={styles.statusContainer}>
          <Text style={[styles.status, getStatusStyle(order.status)]}>
            {order.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginVertical: 5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  itemText: {
    fontSize: 14,
    color: '#555',
    flex: 1, // Ensures item name doesn’t overlap price
  },
  priceText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600', // Makes price slightly prominent
  },
  noItemsText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  assignButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    position: 'relative',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    textTransform: 'capitalize',
    overflow: 'hidden',
  },
  statusPlaced: {backgroundColor: '#28a745'},
  statusAccepted: {backgroundColor: '#007AFF'},
  statusPacked: {backgroundColor: '#17a2b8'},
  statusCancelled: {backgroundColor: '#6c757d'},
  statusDefault: {backgroundColor: '#6c757d'},
  deliveryIcon: {
    marginRight: 8,
  },
});

export default OrderCard;
