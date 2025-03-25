import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import api from '../../services/api';

const OrderCard = ({
  order,
  onAccept,
  onReject,
  onCancelItem,
  onAssignDeliveryPartner, // New prop for packed delivery orders
  navigation,
  onPress, // New optional prop to override default onPress behavior
}) => {
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

  // Default navigation to OrderDetail if no custom onPress is provided
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

  return (
    <TouchableOpacity onPress={handlePress} style={styles.card}>
      <Text style={styles.orderId}>Order ID: {order.orderId}</Text>
      {order.items.map(item => (
        <View key={item._id} style={styles.item}>
          <Text style={styles.itemText}>
            {item.item.name} x {item.count}
          </Text>
        </View>
      ))}

      <View style={styles.statusContainer}>
        <Text style={[styles.status, getStatusStyle(order.status)]}>
          {order.status}
        </Text>
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
  statusContainer: {
    alignItems: 'flex-end',
    marginTop: 10,
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
});

export default OrderCard;
