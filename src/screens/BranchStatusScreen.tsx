import React, {useEffect, useState} from 'react';
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
    console.log('useEffect triggered with phone:', phone, 'status:', status);

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
    socketService.connectBranchRegistration(phone);
    const socket = socketService.getSocket();

    if (!socket) {
      console.error('Socket not initialized');
      setSocketError('Socket not initialized');
      setLoading(false);
      return;
    }

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      setLoading(false);
    });

    socket.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
      setSocketError('Failed to connect to server. Please try again later.');
      setLoading(false);
    });

    socket.on(
      'branchStatusUpdated',
      (data: {
        branchId: string;
        phone: string;
        status: string;
        accessToken?: string;
      }) => {
        console.log('Received branchStatusUpdated event:', data);
        if (data.branchId === id) {
          console.log('Updating branch with branchStatusUpdated data:', data);
          const updatedBranch = {
            _id: data.branchId,
            phone: data.phone,
            status: data.status,
            accessToken: data.accessToken, // Ensure token is included
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
          setBranch(updatedBranch);
          console.log(
            'setBranch called with accessToken:',
            updatedBranch.accessToken,
          );
          // Force persistence to ensure accessToken is saved
          storage.set('branchData', JSON.stringify(updatedBranch));
          console.log(
            'Forced branch persistence with accessToken:',
            updatedBranch.accessToken,
          );
          storage.set('branchStatus', data.status);
          if (data.status === 'approved') {
            console.log(
              'branchStatusUpdated status is approved, navigating to HomeScreen',
            );
            navigation.replace('HomeScreen');
          }
        }
      },
    );

    return () => {
      console.log('Cleaning up socket listeners');
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
