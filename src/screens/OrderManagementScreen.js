import React, {useEffect, useState} from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import Header from '../components/Header';
import OrderCard from '../components/OrderCard';
import {useStore} from '../store/store';
import api from '../services/api';
import io from 'socket.io-client';

export default function OrderManagementScreen() {
  const {setOrders, orders} = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/orders?status=pending');
        setOrders(response.data);
      } catch (err) {
        console.error('Fetch Orders Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();

    const socket = io('http://localhost:3000');
    socket.on('orderAccepted', data => setOrders(prev => [...prev, data]));
    socket.on('order:item-unavailable', data =>
      setOrders(prev =>
        prev.map(o => (o._id === data.order._id ? data.order : o)),
      ),
    );

    return () => socket.disconnect();
  }, [setOrders]);

  const handleAccept = orderId =>
    setOrders(
      orders.map(o => (o._id === orderId ? {...o, status: 'preparing'} : o)),
    );
  const handleReject = orderId =>
    setOrders(orders.filter(o => o._id !== orderId));
  const handleCancelItem = (orderId, itemId) => {
    setOrders(
      orders.map(o =>
        o._id === orderId
          ? {...o, items: o.items.filter(i => i.id !== itemId)}
          : o,
      ),
    );
  };

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Header title="Order Management" />
      <FlatList
        data={orders}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <OrderCard
            order={item}
            onAccept={handleAccept}
            onReject={handleReject}
            onCancelItem={handleCancelItem}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
});
