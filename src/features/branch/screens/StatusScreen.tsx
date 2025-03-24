import React, {useEffect, useCallback, useRef} from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useStore} from '../../../store/ordersStore';
import {fetchBranchStatus} from '../../../services/api';
import socketService from '../../../services/socket';
import {storage} from '../../../utils/storage'; 
import {shallow} from 'zustand/shallow';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/types';

type StatusScreenProps = StackScreenProps<RootStackParamList, 'Status'>;

const StatusScreen: React.FC<StatusScreenProps> = ({route, navigation}) => {
  console.log('StatusScreen mounted with route.params:', route?.params);

  const {branchId} = route?.params || {};
  if (!branchId) {
    console.error('No branchId provided in route params');
    return <Text style={styles.text}>Error: No branch ID provided</Text>;
  }

  const {
    branches,
    addBranch,
    updateBranchStatus,
    userId
  } = useStore(
    state => ({
      branches: state.branches,
      addBranch: state.addBranch,
      updateBranchStatus: state.updateBranchStatus,
      userId: state.userId
    }),
    shallow
  );
  const branch = branches.find(b => b.id === branchId);

  console.log('Render - Branch from store:', branch);

  const hasFetched = useRef(false);

  const syncBranchStatus = useCallback(async () => {
    if (hasFetched.current) return;
    console.log('syncBranchStatus called with branchId:', branchId);
    try {
      const response = await fetchBranchStatus(branchId);
      console.log('Fetched status:', response.status);
      const existingBranch = branches.find(b => b.id === branchId);
      if (!existingBranch) {
        console.log('Adding new branch to store:', response);
        addBranch({
          id: response.branchId,
          status: response.status,
          name: response.name,
          phone: response.phone,
          address: {street: '', area: '', city: '', pincode: ''},
          location: {type: 'Point', coordinates: [0, 0]},
          openingTime: '',
          closingTime: '',
          ownerName: '',
          govId: '',
          deliveryServiceAvailable: false,
          selfPickup: false,
          branchfrontImage: '',
          ownerIdProof: '',
          ownerPhoto: '',
        });
      } else {
        console.log('Updating branch status:', response.status);
        updateBranchStatus(branchId, response.status);
      }
      hasFetched.current = true;
      if (response.status === 'approved') {
        storage.set('isApproved', true);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, [branchId, addBranch, updateBranchStatus]); 

  useEffect(() => {
    console.log('useEffect running for branchId:', branchId);
    syncBranchStatus();
    AsyncStorage.getItem('branchPhone').then(phone => {
      if (phone) {
        console.log('Connecting socket with phone:', phone);
        socketService.connectBranchRegistration(phone);
      }
    });
  }, [syncBranchStatus]);

  const handleWelcomeClick = useCallback(() => {
    console.log('Welcome clicked');
    storage.set('isApproved', true);
    console.log('Navigating to HomeScreen with userId:', userId);
    navigation.replace('HomeScreen', {userId}); 
  }, [navigation, userId]);

  const handleRetry = useCallback(() => {
    console.log('Retry clicked');
    hasFetched.current = false;
    syncBranchStatus();
  }, [syncBranchStatus]);

  const handleResubmit = useCallback(() => {
    console.log('Resubmit clicked');
    navigation.navigate('BranchAuth', {branchId, isResubmit: true});
  }, [navigation, branchId]);

  if (!branch) {
    return <Text style={styles.text}>Loading branch data...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {branch.status === 'pending'
          ? 'Your branch is pending approval...'
          : `Branch Registration Status: ${branch.status}`}
      </Text>
      <Button title="Refresh" onPress={handleRetry} />
      {branch.status === 'approved' && (
        <View style={styles.buttonSpacing}>
          <Button title="Welcome to SyncMart" onPress={handleWelcomeClick} />
        </View>
      )}
      {branch.status === 'rejected' && (
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
