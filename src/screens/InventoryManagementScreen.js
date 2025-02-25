import React, {useEffect, useState} from 'react';
import {View, FlatList, StyleSheet} from 'react-native';
import Header from '../components/Header';
import InventoryItem from '../components/InventoryItem';
import {useStore} from '../store/store';
import api from '../services/api';
import io from 'socket.io-client';

export default function InventoryManagementScreen() {
  const {setInventory, inventory} = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await api.get('/products');
        setInventory(response.data);
      } catch (err) {
        console.error('Fetch Inventory Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();

    const socket = io('http://localhost:3000');
    socket.on('inventory:update', data => setInventory(data.inventory));

    return () => socket.disconnect();
  }, [setInventory]);

  const handleToggle = (itemId, inStock) => {
    setInventory(inventory.map(i => (i._id === itemId ? {...i, inStock} : i)));
  };

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Header title="Inventory Management" />
      <FlatList
        data={inventory}
        keyExtractor={item => item._id}
        renderItem={({item}) => (
          <InventoryItem item={item} onToggle={handleToggle} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
});
