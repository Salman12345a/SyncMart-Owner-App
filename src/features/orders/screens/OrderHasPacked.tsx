import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import {useStore} from '../../../store/ordersStore';
import Icon from 'react-native-vector-icons/MaterialIcons';

type OrderHasPackedProps = StackScreenProps<
  RootStackParamList,
  'OrderHasPacked'
>;

const OrderHasPacked: React.FC<OrderHasPackedProps> = ({route, navigation}) => {
  const {order: initialOrder} = route.params;
  const orderState =
    useStore(state => state.orders.find(o => o._id === initialOrder._id)) ||
    initialOrder;
  const {updateOrder} = useStore();

  const handleCollectCash = () => {
    if (!orderState.deliveryServiceAvailable) {
      // Update store synchronously
      updateOrder(orderState._id, {...orderState});
      // Navigate back after update
      navigation.goBack();
    } else {
      console.log('Error: Collect Cash is only for pickup orders');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Icon name="check-circle" size={32} color="#2ecc71" />
        <Text style={styles.title}>Order Ready for Pickup</Text>
        <Text style={styles.orderId}>#{orderState.orderId}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Items</Text>
        <FlatList
          data={orderState.items}
          renderItem={({item}) => (
            <View style={styles.item}>
              <Icon
                name="inventory"
                size={20}
                color="#3498db"
                style={styles.itemIcon}
              />
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>{item.item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.count} x ₹{item.item.price}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                ₹{item.count * item.item.price}
              </Text>
            </View>
          )}
          keyExtractor={item => item._id}
          scrollEnabled={false}
        />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.total}>Total: ₹{orderState.totalPrice}</Text>
        {orderState.modificationHistory &&
          orderState.modificationHistory.length > 0 && (
            <View style={styles.changes}>
              <Text style={styles.changesTitle}>Modification History:</Text>
              {orderState.modificationHistory[0]?.changes?.map(
                (change, index) => (
                  <View key={index} style={styles.changeItem}>
                    <Icon name="edit" size={14} color="#95a5a6" />
                    <Text style={styles.changeText}>{change}</Text>
                  </View>
                ),
              )}
            </View>
          )}
      </View>

      <View style={styles.notice}>
        <Icon name="info" size={24} color="#3498db" />
        <Text style={styles.message}>
          Informed Customer! To visit the Dk mart to collect their items.
        </Text>
      </View>

      {!orderState.deliveryServiceAvailable && (
        <TouchableOpacity
          onPress={handleCollectCash}
          style={styles.collectCashButton}>
          <Text style={styles.collectCashButtonText}>Collect Cash</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
  },
  orderId: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f6fa',
  },
  itemIcon: {
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2ecc71',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  total: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'right',
    marginBottom: 15,
  },
  changes: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  changesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e67e22',
    marginBottom: 10,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  changeText: {
    fontSize: 14,
    color: '#95a5a6',
    marginLeft: 8,
    flex: 1,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#3498db',
    marginLeft: 15,
    flex: 1,
  },
  collectCashButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  collectCashButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OrderHasPacked;
