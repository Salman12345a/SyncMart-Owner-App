import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const StatusScreen: React.FC = ({route, navigation}) => {
  const {id, status, name, photo} = route.params;

  return (
    <View style={styles.container}>
      <Image
        source={{uri: photo || 'https://via.placeholder.com/150'}}
        style={styles.photo}
      />
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.orderId}>Order ID: N/A</Text>
      <Text
        style={[
          styles.status,
          status === 'approved' && styles.approvedStatus,
          status === 'pending' && styles.pendingStatus,
          status === 'rejected' && styles.rejectedStatus,
        ]}>
        Status: {status}
      </Text>
      {status === 'rejected' && (
        <TouchableOpacity
          style={styles.resubmitButton}
          onPress={() => navigation.navigate('DeliveryReRegister', {id})}>
          <Icon name="refresh" size={20} color="#fff" />
          <Text style={styles.resubmitButtonText}>Resubmit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
    backgroundColor: '#ecf0f1', // Placeholder background
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  orderId: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  status: {
    fontSize: 18,
    fontWeight: '500',
  },
  approvedStatus: {
    color: '#2ecc71',
  },
  pendingStatus: {
    color: '#f1c40f',
  },
  rejectedStatus: {
    color: '#e74c3c',
  },
  resubmitButton: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  resubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StatusScreen;
