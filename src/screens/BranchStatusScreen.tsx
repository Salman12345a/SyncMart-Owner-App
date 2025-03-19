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
    phoneFromParams || branch?.phone || storage.getString('branchPhone');
  const status = branch?.status || initialStatus || 'pending';

  useEffect(() => {
    if (!phone) {
      console.error('Phone number unavailable');
      setSocketError('Phone number required to fetch status');
      setLoading(false);
      return;
    }

    // Navigate immediately if status is "approved" on initial render
    if (status === 'approved') {
      navigation.replace('HomeScreen');
      return;
    }

    socketService.connectBranchRegistration(phone);
    const socket = socketService.getSocket();

    if (!socket) {
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
      'branchRegistered',
      (data: {branchId: string; phone: string; status: string}) => {
        if (data.branchId === id) {
          console.log('Received branchRegistered:', data);
          setBranch({
            ...branch,
            _id: data.branchId,
            phone: data.phone,
            status: data.status,
          });
          storage.set('branchStatus', data.status);
          if (data.status === 'approved') {
            navigation.replace('HomeScreen');
          }
        }
      },
    );

    socket.on(
      'branchStatusUpdated',
      (data: {branchId: string; phone: string; status: string}) => {
        if (data.branchId === id) {
          console.log('Received branchStatusUpdated:', data);
          setBranch({
            ...branch,
            _id: data.branchId,
            phone: data.phone,
            status: data.status,
          });
          storage.set('branchStatus', data.status);
          if (data.status === 'approved') {
            navigation.replace('HomeScreen');
          }
        }
      },
    );

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('branchRegistered');
      socket.off('branchStatusUpdated');
      socketService.disconnect();
    };
  }, [id, phone, branch, setBranch, navigation]);

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
