import React, {useEffect, useCallback, useRef, useState} from 'react';
import {View, Text, Button, StyleSheet, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useStore} from '../../../store/ordersStore';
import {fetchBranchStatus, validateToken} from '../../../services/api';
import socketService from '../../../services/socket';
import {storage} from '../../../utils/storage';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/types';
import api from '../../../services/api';
import CongratulationsModal from '../../../components/common/CongratulationsModal';

type StatusScreenProps = StackScreenProps<RootStackParamList, 'Status'>;

const StatusScreen: React.FC<StatusScreenProps> = ({route, navigation}) => {
  const {branchId} = route?.params || {};
  if (!branchId) {
    console.error('No branchId provided in route params');
    return <Text style={styles.text}>Error: No branch ID provided</Text>;
  }

  // Use stable store references
  const branches = useStore(state => state.branches);
  const addBranch = useStore(state => state.addBranch);
  const updateBranchStatus = useStore(state => state.updateBranchStatus);

  const [branchStatus, setBranchStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const hasFetched = useRef(false);
  const isMounted = useRef(true);

  // Memoize branch lookup to prevent unnecessary re-renders
  const branch = React.useMemo(
    () => branches.find(b => b.id === branchId),
    [branches, branchId],
  );

  // Stable callback with minimal dependencies
  const syncBranchStatus = useCallback(async () => {
    if (hasFetched.current || isLoading || !isMounted.current) return;

    setIsLoading(true);
    try {
      console.log('syncBranchStatus called with branchId:', branchId);
      const response = await fetchBranchStatus(branchId);
      console.log('Fetched status:', response.status);

      if (!isMounted.current) return;

      const existingBranch = branches.find(b => b.id === branchId);
      if (!existingBranch) {
        console.log('Adding new branch to store:', response);
        addBranch({
          id: response.branchId,
          status: response.status,
          name: response.name || '',
          phone: response.phone || '',
          address: response.address || {
            street: '',
            area: '',
            city: '',
            pincode: '',
          },
          location: response.location || {
            type: 'Point',
            coordinates: [0, 0],
          },
          branchEmail: response.branchEmail || '',
          openingTime: response.openingTime || '',
          closingTime: response.closingTime || '',
          ownerName: response.ownerName || '',
          govId: response.govId || '',
          deliveryServiceAvailable: response.deliveryServiceAvailable || false,
          selfPickup: response.selfPickup || false,
          branchfrontImage: response.branchfrontImage || '',
          ownerIdProof: response.ownerIdProof || '',
          ownerPhoto: response.ownerPhoto || '',
        });
      } else if (existingBranch.status !== response.status) {
        console.log('Updating branch status:', response.status);
        updateBranchStatus(branchId, response.status);
      }

      setBranchStatus(response.status);
      hasFetched.current = true;

      if (response.status === 'approved') {
        storage.set('isApproved', true);
      }
    } catch (error) {
      console.error('Failed to sync branch status:', error);
      hasFetched.current = false;
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [branchId, addBranch, updateBranchStatus]); // Removed 'branches' and 'isLoading' from deps

  useEffect(() => {
    console.log('useEffect running for branchId:', branchId);
    isMounted.current = true;

    // Only fetch if not already fetched
    if (!hasFetched.current && !branchStatus) {
      syncBranchStatus();
    }

    return () => {
      isMounted.current = false;
    };
  }, [branchId, syncBranchStatus, branchStatus]); // Added branchStatus to prevent re-fetch

  // Handle socket connection separately
  useEffect(() => {
    let socketConnected = false;
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout | null = null;

    const connectSocket = async () => {
      if (socketConnected) return;

      try {
        const phone = await AsyncStorage.getItem('branchPhone');
        if (phone && !socketService.getConnectionStatus().isConnected) {
          console.log(
            `Connecting socket with phone (attempt ${
              retryCount + 1
            }/${maxRetries}):`,
            phone,
          );
          socketService.connectBranchRegistration(phone);

          // Check if connection was successful after a short delay
          setTimeout(() => {
            if (socketService.getConnectionStatus().isConnected) {
              console.log('Socket connection successful');
              socketConnected = true;
              retryCount = 0;
            } else if (retryCount < maxRetries) {
              console.log('Socket connection failed, scheduling retry');
              retryCount++;
              retryTimeout = setTimeout(connectSocket, 2000); // Retry after 2 seconds
            } else {
              console.log(
                'Max retries reached, giving up on socket connection',
              );
            }
          }, 1000);
        }
      } catch (error) {
        console.log('Error connecting socket:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          retryTimeout = setTimeout(connectSocket, 2000);
        }
      }
    };

    connectSocket();

    return () => {
      // Cleanup timeouts on unmount
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []); // Empty deps - only run once on mount

  const handleWelcomeClick = useCallback(async () => {
    try {
      console.log('Welcome clicked');
      setIsLoading(true);

      // Set as approved in storage
      storage.set('isApproved', true);
      storage.set('isRegistered', true);
      storage.set('branchId', branchId);

      // Store user ID if not stored already
      const currentUserId = useStore.getState().userId || branchId;
      if (!useStore.getState().userId) {
        storage.set('userId', currentUserId);
        useStore.getState().setUserId(currentUserId);
      }

      // Clear any existing token to force a fresh login
      storage.delete('accessToken');

      // Show celebration modal instead of alert
      setIsLoading(false);
      setShowCongratulations(true);
    } catch (error) {
      console.error('Welcome button error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }, [navigation, branchId]);

  const handleCongratulationsClose = useCallback(() => {
    setShowCongratulations(false);
    // Navigate to Authentication screen
    navigation.reset({
      index: 0,
      routes: [{name: 'Authentication' as any}],
    });
  }, [navigation]);

  const handleRetry = useCallback(() => {
    console.log('Retry clicked');
    hasFetched.current = false;
    syncBranchStatus();
  }, [syncBranchStatus]);

  const handleResubmit = useCallback(() => {
    console.log('Resubmit clicked');
    navigation.navigate('BranchAuth' as any, {branchId, isResubmit: true});
  }, [navigation, branchId]);

  const currentStatus = branchStatus || branch?.status;
  const branchName = branch?.name || 'Your Branch';

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isLoading
          ? 'Processing, please wait...'
          : currentStatus === 'pending'
          ? 'Your branch is pending approval...'
          : currentStatus === 'approved'
          ? 'Congratulations! Your branch has been approved!'
          : currentStatus === 'rejected'
          ? 'Your branch registration was rejected. Please update your information and resubmit.'
          : 'No status available'}
      </Text>
      <Button
        title={isLoading ? 'Please wait...' : 'Refresh'}
        onPress={handleRetry}
        disabled={isLoading}
      />
      {currentStatus === 'approved' && (
        <View style={styles.buttonSpacing}>
          <Button
            title={isLoading ? 'Preparing dashboard...' : 'Welcome to SyncMart'}
            onPress={handleWelcomeClick}
            disabled={isLoading}
          />
        </View>
      )}
      {currentStatus === 'rejected' && (
        <View style={styles.buttonSpacing}>
          <Button
            title="Resubmit"
            onPress={handleResubmit}
            disabled={isLoading}
          />
        </View>
      )}

      {/* Congratulations Modal */}
      <CongratulationsModal
        visible={showCongratulations}
        branchName={branchName}
        onClose={handleCongratulationsClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  buttonSpacing: {
    marginTop: 10,
  },
});

export default StatusScreen;
