import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useStore} from '../store/ordersStore';
import api, {fetchOrderDetails} from '../services/api';

type AssignDeliveryPartnerProps = StackScreenProps<
  RootStackParamList,
  'AssignDeliveryPartner'
>;

interface Partner {
  _id: string;
  name: string;
  availability: boolean;
}

const AssignDeliveryPartner: React.FC<AssignDeliveryPartnerProps> = ({
  route,
  navigation,
}) => {
  const {order: initialOrder} = route.params;
  const orderState =
    useStore(state => state.orders.find(o => o._id === initialOrder._id)) ||
    initialOrder;
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

  // Fetch order details to get delivery partners
  useEffect(() => {
    const loadOrderDetails = async () => {
      try {
        const orderData = await fetchOrderDetails(orderState._id);
        const availablePartners =
          orderData.branch?.deliveryPartners?.filter(
            (p: Partner) => p.availability,
          ) || [];
        setPartners(availablePartners);
      } catch (error) {
        Alert.alert('Error', 'Failed to load delivery partners');
      }
    };
    loadOrderDetails();
  }, [orderState._id]);

  const handleAssign = async () => {
    if (!selectedPartner) {
      Alert.alert('Error', 'Please select a delivery partner');
      return;
    }
    try {
      const response = await api.patch(
        `/orders/${orderState._id}/assign/${selectedPartner}`,
      );
      console.log('Assigned partner:', response.data);
      navigation.goBack();
    } catch (error) {
      console.error('Assign Error:', error.response?.data || error.message);
      Alert.alert('Error', 'Failed to assign delivery partner');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order #{orderState.orderId}</Text>
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
        contentContainerStyle={styles.orderList}
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
      <Text style={styles.subtitle}>Select Delivery Partner:</Text>
      <FlatList
        data={partners}
        renderItem={({item}) => (
          <TouchableOpacity
            style={[
              styles.partnerItem,
              selectedPartner === item._id && styles.selectedPartner,
            ]}
            onPress={() => setSelectedPartner(item._id)}>
            <Text style={styles.partnerText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.partnerList}
        ListEmptyComponent={<Text>No available delivery partners</Text>}
      />
      <TouchableOpacity
        onPress={handleAssign}
        style={[styles.assignButton, !selectedPartner && styles.disabledButton]}
        disabled={!selectedPartner}>
        <Text style={styles.assignButtonText}>Assign Delivery Partner</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#f5f5f5'},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333'},
  item: {marginVertical: 5},
  orderList: {paddingBottom: 10},
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
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  partnerList: {paddingBottom: 20},
  partnerItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    marginVertical: 5,
    backgroundColor: '#fff',
  },
  selectedPartner: {backgroundColor: '#e6f0ff', borderColor: '#007AFF'},
  partnerText: {fontSize: 16, color: '#333'},
  assignButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {backgroundColor: '#cccccc'},
  assignButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
});

export default AssignDeliveryPartner;
