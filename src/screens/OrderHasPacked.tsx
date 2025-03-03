import React from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useStore} from '../store/ordersStore';

type OrderHasPackedProps = StackScreenProps<
  RootStackParamList,
  'OrderHasPacked'
>;

const OrderHasPacked: React.FC<OrderHasPackedProps> = ({route}) => {
  const {order: initialOrder} = route.params;
  const orderState =
    useStore(state => state.orders.find(o => o._id === initialOrder._id)) ||
    initialOrder;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Order #{orderState.orderId} - Ready for Pickup
      </Text>
      <FlatList
        data={orderState.items}
        renderItem={({item}) => (
          <View style={styles.item}>
            <Text>
              {item.item.name} x {item.count} - ₹{item.item.price}
            </Text>
          </View>
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
      />
      <Text style={styles.total}>Total: ₹{orderState.totalPrice}</Text>
      {orderState.modificationHistory?.length > 0 && (
        <View style={styles.changes}>
          <Text style={styles.changesTitle}>Changes:</Text>
          {orderState.modificationHistory[0].changes.map((change, index) => (
            <Text key={index} style={styles.changeText}>
              {change}
            </Text>
          ))}
        </View>
      )}
      <Text style={styles.message}>
        Please visit the store to collect your order.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#f5f5f5'},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333'},
  item: {marginVertical: 5},
  list: {paddingBottom: 20},
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'right',
    color: '#333',
  },
  changes: {marginVertical: 10},
  changesTitle: {fontSize: 16, fontWeight: 'bold', color: '#333'},
  changeText: {fontSize: 14, color: '#555'},
  message: {fontSize: 16, color: '#555', marginTop: 20, textAlign: 'center'},
});

export default OrderHasPacked;
