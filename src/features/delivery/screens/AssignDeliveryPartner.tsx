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
  const {userId, updateOrder} = useStore();
  const [orderState, setOrderState] = useState(initialOrder);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const loadOrderAndPartners = async () => {
      try {
        const orderData = await fetchOrderDetails(initialOrder._id);
        console.log('Fetched Order Data:', JSON.stringify(orderData, null, 2));
        setOrderState(orderData);
        updateOrder(initialOrder._id, orderData);

        if (!orderData.deliveryEnabled) {
          Alert.alert(
            'Error',
            'This screen is for delivery-enabled orders only',
          );
          navigation.goBack();
          return;
        }

        const branchPartners = await fetchDeliveryPartners(userId);
        console.log(
          'Fetched Branch Partners:',
          JSON.stringify(branchPartners, null, 2),
        );

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
  }, [initialOrder._id, userId, navigation, updateOrder]);

  useEffect(() => {
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
      console.log('Assign Response:', JSON.stringify(response.data, null, 2));
      setOrderState(response.data);
      updateOrder(orderState._id, response.data);
      Alert.alert('Success', 'Delivery partner assigned successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Assign Error:', error);
      Alert.alert('Error', 'Failed to assign delivery partner');
    }
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>Order #{orderState.orderId}</Text>
        <Text style={styles.orderId}>Status: {orderState.status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Order Items</Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View>
      <View style={styles.summaryCard}>
        <Text style={styles.total}>Total: ₹{orderState.totalPrice || 0}</Text>
        {orderState.modificationHistory &&
          orderState.modificationHistory.length > 0 && (
            <View style={styles.changes}>
              <Text style={styles.changesTitle}>Changes:</Text>
              {orderState.modificationHistory[0].changes.map(
                (change, index) => (
                  <Text key={index} style={styles.changeText}>
                    {change}
                  </Text>
                ),
              )}
            </View>
          )}
      </View>

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
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orderState.items}
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.item}>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName}>
                  {item.item.name || 'Unknown Item'}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.count} x ₹{item.item.price || 0}
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                ₹{(item.item.price || 0) * item.count}
              </Text>
            </View>
          </View>
        )}
        keyExtractor={item => item._id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{paddingBottom: 20}}
      />

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
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20, // Match OrderHasPacked padding
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
    paddingHorizontal: 20, // Match OrderHasPacked
    paddingTop: 10, // Adjusted to fit items
    paddingBottom: 10,
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
  changeText: {
    fontSize: 14,
    color: '#95a5a6',
  },
  noPartners: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  assignedText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  deliveredText: {
    fontSize: 16,
    color: '#2ecc71',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  partnerListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  partnerItem: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: 'white',
    marginVertical: 5,
  },
  partnerText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  assignButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AssignDeliveryPartner;
