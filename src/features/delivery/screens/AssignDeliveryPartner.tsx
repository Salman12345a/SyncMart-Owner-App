import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import {useStore} from '../../../store/ordersStore';
import api, {
  fetchOrderDetails,
  fetchDeliveryPartners,
} from '../../../services/api';

type AssignDeliveryPartnerProps = StackScreenProps<
  RootStackParamList,
  'AssignDeliveryPartner'
>;

interface Partner {
  _id: string;
  name: string;
  availability: boolean;
  status: 'pending' | 'approved' | 'rejected';
  currentOrders?: string[];
}

const AssignDeliveryPartner: React.FC<AssignDeliveryPartnerProps> = ({
  route,
  navigation,
}) => {
  const {order: initialOrder} = route.params;
  const orderState =
    useStore(state => state.orders.find(o => o._id === initialOrder._id)) ||
    initialOrder;
  const {userId, updateOrder} = useStore();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const loadOrderAndPartners = async () => {
      try {
        // Fetch order details to ensure order data is current
        const orderData = await fetchOrderDetails(orderState._id);
        console.log('Raw Order Data:', JSON.stringify(orderData, null, 2));

        // Only proceed if it's a delivery order (use deliveryEnabled)
        if (!orderData.deliveryEnabled) {
          Alert.alert(
            'Error',
            'This screen is for delivery-enabled orders only',
          );
          navigation.goBack();
          return;
        }

        // Fetch delivery partners directly from branch endpoint
        const branchPartners = await fetchDeliveryPartners(userId);
        console.log('Raw Branch Partners:', branchPartners);

        // Filter approved partners
        const approvedPartners = branchPartners.filter((p: Partner) => {
          const status = p.status?.toLowerCase();
          const isApproved = status === 'approved';
          console.log(
            `Partner ${p._id} - Status: ${status}, Approved: ${isApproved}`,
          );
          return isApproved;
        });

        console.log('Approved Partners:', approvedPartners);
        if (approvedPartners.length === 0 && branchPartners.length > 0) {
          console.warn(
            'No approved partners found, but raw partners exist:',
            branchPartners,
          );
        }
        setPartners(approvedPartners);
      } catch (error) {
        console.error('Load Error:', error);
        Alert.alert('Error', 'Failed to load order or partners');
        navigation.goBack();
      }
    };
    loadOrderAndPartners();
  }, [orderState._id, userId, navigation]);

  useEffect(() => {
    // Navigate to OrderHistory when status becomes "delivered"
    if (orderState.status === 'delivered') {
      Alert.alert('Success', 'Order delivered, moved to history');
      navigation.navigate('OrderHistory', {screen: 'delivery'});
    }
  }, [orderState.status, navigation]);

  const handleAssignDelivery = async (partnerId?: string) => {
    try {
      const selectedPartnerId =
        partnerId || (partners.length === 1 ? partners[0]._id : null);
      if (!selectedPartnerId) {
        setIsModalVisible(true);
        return;
      }
      const response = await api.patch(
        `/orders/${orderState._id}/assign/${selectedPartnerId}`,
      );
      updateOrder(orderState._id, response.data);
      Alert.alert('Success', 'Delivery partner assigned successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to assign delivery partner');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order #{orderState.orderId}</Text>
      <Text style={styles.status}>Status: {orderState.status}</Text>
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
      {orderState.modificationHistory &&
        orderState.modificationHistory.length > 0 && (
          <View style={styles.changes}>
            <Text style={styles.changesTitle}>Changes:</Text>
            {orderState.modificationHistory[0].changes.map((change, index) => (
              <Text key={index} style={styles.changeText}>
                {change}
              </Text>
            ))}
          </View>
        )}
      {orderState.status === 'packed' && partners.length === 0 ? (
        <Text style={styles.noPartners}>
          No approved delivery partners available
        </Text>
      ) : orderState.status === 'packed' ? (
        <>
          <FlatList
            data={partners}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.partnerItem}
                onPress={() => handleAssignDelivery(item._id)}>
                <Text style={styles.partnerText}>
                  {item.name} (Orders: {item.currentOrders?.length || 0})
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item._id}
            ListHeaderComponent={
              <Text style={styles.partnerListTitle}>
                Select Approved Delivery Partner:
              </Text>
            }
          />
          {partners.length === 1 && (
            <TouchableOpacity
              onPress={() => handleAssignDelivery()}
              style={styles.assignButton}>
              <Text style={styles.assignButtonText}>Assign Delivery</Text>
            </TouchableOpacity>
          )}
        </>
      ) : orderState.status === 'assigned' ? (
        <Text style={styles.assignedText}>
          Order assigned, awaiting delivery
        </Text>
      ) : orderState.status === 'delivered' ? (
        <Text style={styles.deliveredText}>Order delivered</Text>
      ) : null}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalContainer}>
          <FlatList
            data={partners}
            renderItem={({item}) => (
              <TouchableOpacity
                style={styles.partnerItem}
                onPress={() => {
                  handleAssignDelivery(item._id);
                  setIsModalVisible(false);
                }}>
                <Text style={styles.partnerText}>
                  {item.name} (Orders: {item.currentOrders?.length || 0})
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={item => item._id}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, backgroundColor: '#f5f5f5'},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: '#333'},
  status: {fontSize: 16, marginBottom: 10, color: '#555'},
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
  noPartners: {fontSize: 16, color: '#555', textAlign: 'center', marginTop: 20},
  assignedText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
  deliveredText: {
    fontSize: 16,
    color: '#2ecc71',
    textAlign: 'center',
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  partnerListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  partnerItem: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    marginVertical: 5,
    backgroundColor: '#fff',
  },
  partnerText: {fontSize: 16, color: '#333'},
  assignButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  assignButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
});

export default AssignDeliveryPartner;
