import React, {useState} from 'react';
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
import UniversalAdd from '../components/ui/UniversalAdd'; // Adjusted import path
import api from '../services/api';
import {useStore} from '../store/ordersStore';

type OrderDetailProps = StackScreenProps<RootStackParamList, 'OrderDetail'>;

const OrderDetail: React.FC<OrderDetailProps> = ({route, navigation}) => {
  const {order} = route.params;
  const {updateOrder} = useStore();
  const [updatedItems, setUpdatedItems] = useState(order.items);

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
                order.items.find(o => o._id === i._id)?.count || i.count,
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

  const handlePackedOrder = async () => {
    try {
      const modifiedItems = updatedItems.map(item => ({
        item: item._id,
        count: item.count,
      }));
      await api.patch(`/orders/${order._id}/modify`, {modifiedItems});
      const response = await api.patch(`/orders/${order._id}/pack`);
      updateOrder(order._id, response.data); // Assuming pack returns updated order
      navigation.goBack();
    } catch (error) {
      console.error('Packed Order Error:', error);
      Alert.alert('Error', 'Failed to pack order');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order {order.orderId}</Text>
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
            <UniversalAdd
              item={item}
              count={getItemCount}
              addItem={addItem}
              removeItem={removeItem}
            />
          </View>
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity onPress={handlePackedOrder} style={styles.packButton}>
        <Text style={styles.packButtonText}>Packed Order</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20},
  title: {fontSize: 20, fontWeight: 'bold', marginBottom: 15},
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  itemDetails: {flex: 1},
  list: {paddingBottom: 20},
  packButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  packButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
});

export default OrderDetail;
