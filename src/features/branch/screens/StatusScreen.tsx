import React, {useEffect, useCallback, useRef, useState} from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useStore} from '../../../store/ordersStore';
import {fetchBranchStatus} from '../../../services/api';
import socketService from '../../../services/socket';
import {storage} from '../../../utils/storage';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/types';

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
    const connectSocket = async () => {
      if (socketConnected) return;

      try {
        const phone = await AsyncStorage.getItem('branchPhone');
        if (phone && !socketService.isConnected?.()) {
          console.log('Connecting socket with phone:', phone);
          socketService.connectBranchRegistration(phone);
          socketConnected = true;
        }
      } catch (error) {
        console.error('Error connecting socket:', error);
      }
    };

    connectSocket();

    return () => {
      // Cleanup if needed
      // if (socketConnected) socketService.disconnect();
    };
  }, []); // Empty deps - only run once on mount

  const handleWelcomeClick = useCallback(() => {
    console.log('Welcome clicked');
    // Set as approved in storage
    storage.set('isApproved', true);
    // Store user ID if not stored already
    const currentUserId = useStore.getState().userId || branchId;
    if (!useStore.getState().userId) {
      storage.set('userId', branchId);
      useStore.getState().setUserId(branchId);
    }
    console.log('Navigating to HomeScreen with userId:', currentUserId);
    navigation.replace('HomeScreen' as any);
  }, [navigation, branchId]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {isLoading
          ? 'Checking status...'
          : currentStatus === 'pending'
          ? 'Your branch is pending approval...'
          : currentStatus
          ? `Branch Registration Status: ${currentStatus}`
          : 'No status available'}
      </Text>
      <Button
        title={isLoading ? 'Refreshing...' : 'Refresh'}
        onPress={handleRetry}
        disabled={isLoading}
      />
      {currentStatus === 'approved' && (
        <View style={styles.buttonSpacing}>
          <Button title="Welcome to SyncMart" onPress={handleWelcomeClick} />
        </View>
      )}
      {currentStatus === 'rejected' && (
        <View style={styles.buttonSpacing}>
          <Button title="Resubmit" onPress={handleResubmit} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, alignItems: 'center', backgroundColor: '#f5f5f5'},
  text: {fontSize: 16, marginBottom: 20},
  buttonSpacing: {marginTop: 10},
});

export default StatusScreen;
