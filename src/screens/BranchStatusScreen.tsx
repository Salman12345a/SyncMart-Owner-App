import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import socketService from '../services/socket';
import {useStore} from '../store/ordersStore';
import {storage} from '../utils/storage';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'BranchStatusScreen'
>;

const BranchStatusScreen: React.FC = ({route}) => {
  const navigation = useNavigation<NavigationProp>();
  const {
    id,
    status: initialStatus,
    phone: phoneFromParams,
  } = route.params || {};
  const {branch, setBranch} = useStore();
  const [loading, setLoading] = useState(true);
  const [socketError, setSocketError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const phone =
    phoneFromParams ||
    branch?.phone ||
    storage.getString('branchPhone') ||
    '5555555555';
  const storedStatus = storage.getString('branchStatus');
  const status = branch?.status || storedStatus || initialStatus || 'pending';

  console.log(
    `BranchStatusScreen initialized with id: ${id}, phone: ${phone}, initialStatus: ${
      initialStatus || 'none'
    }, storedStatus: ${storedStatus || 'none'}, currentStatus: ${status}`,
  );

  useEffect(() => {
    storage.delete('branchData');
    console.log('Cleared branchData from storage to ensure fresh token');

    isMounted.current = true;

    if (!phone) {
      console.error('Phone number unavailable');
      setSocketError('Phone number required to fetch status');
      setLoading(false);
      return;
    }

    if (status === 'approved') {
      console.log(
        'Status is approved on initial render, navigating to HomeScreen',
      );
      navigation.replace('HomeScreen');
      return;
    }

    console.log(`Connecting socket with phone: ${phone}`);
    const socket = socketService.connectBranchRegistration(phone);

    if (!socket) {
      console.error('Socket not initialized');
      setSocketError('Socket not initialized');
      setLoading(false);
      return;
    }

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      if (isMounted.current) setLoading(false);
    });

    socket.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
      if (isMounted.current) {
        setSocketError('Failed to connect to server. Please try again later.');
        setLoading(false);
      }
    });

    socket.on('branchStatusUpdated', data => {
      console.log('Received branchStatusUpdated event:', data);
      try {
        if (data.accessToken) {
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          console.log('New Token Payload:', payload);
        }
        console.log(
          'Comparing data.branchId:',
          data.branchId,
          'with route id:',
          id,
        );
        if (data.branchId === id) {
          console.log('Branch ID matches, updating branch with data:', data);
          const updatedBranch = {
            _id: data.branchId,
            phone: data.phone,
            status: data.status,
            accessToken: data.accessToken,
            name: branch?.name || '',
            storeStatus: branch?.storeStatus || 'open',
            deliveryServiceAvailable: branch?.deliveryServiceAvailable || false,
            location: branch?.location || {type: 'Point', coordinates: [0, 0]},
            address: branch?.address || {
              street: '',
              area: '',
              city: '',
              pincode: '',
            },
            openingTime: branch?.openingTime || '',
            closingTime: branch?.closingTime || '',
            ownerName: branch?.ownerName || '',
            govId: branch?.govId || '',
            selfPickup: branch?.selfPickup || false,
            branchfrontImage: branch?.branchfrontImage || '',
            ownerIdProof: branch?.ownerIdProof || '',
            ownerPhoto: branch?.ownerPhoto || '',
          };
          console.log('Calling setBranch with updatedBranch:', updatedBranch);
          if (isMounted.current) {
            setBranch(updatedBranch);
            storage.set('branchData', JSON.stringify(updatedBranch));
            storage.set('branchStatus', data.status);
            console.log(
              'Forced branch persistence with accessToken:',
              updatedBranch.accessToken,
            );
            if (data.status === 'approved') {
              console.log(
                'branchStatusUpdated status is approved, navigating to HomeScreen',
              );
              navigation.replace('HomeScreen');
            } else {
              console.log(
                'Status is not approved, staying on BranchStatusScreen',
              );
            }
          }
        } else {
          console.log('Branch ID does not match route id, skipping update');
        }
      } catch (error) {
        console.error('Error processing branchStatusUpdated:', error);
      }
    });

    return () => {
      console.log('Cleaning up socket listeners');
      isMounted.current = false;
      socket.off('connect');
      socket.off('connect_error');
      socket.off('branchStatusUpdated');
    };
  }, [id, phone, navigation, setBranch]);

  console.log('Rendering with current status:', status);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Branch Registration Status</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2c3e50" />
      ) : socketError ? (
        <Text style={styles.errorText}>{socketError}</Text>
      ) : (
        <>
          <Text style={styles.status}>Status: {status}</Text>
          {status === 'rejected' && (
            <Text style={styles.errorText}>
              Your branch registration was rejected. Please contact support.
            </Text>
          )}
          {status === 'pending' && (
            <Text style={styles.infoText}>
              Your registration is under review. Please wait for approval.
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
  },
  status: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default BranchStatusScreen;
