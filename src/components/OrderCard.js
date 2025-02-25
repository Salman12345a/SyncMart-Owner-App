import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import api from '../services/api';

const OrderCard = ({order, onAccept, onReject, onCancelItem}) => {
  const handleAccept = async () => {
    await api.patch(`/orders/${order._id}/accept`);
    onAccept(order._id);
  };

  const handleReject = async () => {
    await api.patch(`/orders/${order._id}/reject`, {
      reason: 'item unavailable',
    });
    onReject(order._id);
  };

  const handleCancelItem = async itemId => {
    await api.patch(`/orders/${order._id}/cancel-item/${itemId}`);
    onCancelItem(order._id, itemId);
  };

  return (
    <View style={styles.card}>
      <Text>Order ID: {order.orderId}</Text>
      <Text>Status: {order.status}</Text>
      <Text>Total: ₹{order.totalPrice}</Text>
      {order.items.map(item => (
        <View key={item._id} style={styles.item}>
          <Text>
            {item.item.name} x {item.count}
          </Text>
          <TouchableOpacity onPress={() => handleCancelItem(item.id)}>
            <Text style={styles.cancel}>Cancel Item</Text>
          </TouchableOpacity>
        </View>
      ))}
      {order.status === 'pending' && (
        <>
          <TouchableOpacity onPress={handleAccept} style={styles.button}>
            <Text>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReject} style={styles.button}>
            <Text>Reject</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {padding: 15, borderWidth: 1, borderRadius: 5, marginVertical: 5},
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  cancel: {color: 'red'},
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
});

export default OrderCard;
