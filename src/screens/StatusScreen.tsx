import React, {useEffect, useCallback, useState, useRef} from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useStore} from '../store/ordersStore';
import {fetchBranchStatus} from '../services/api';

const StatusScreen: React.FC = ({route, navigation}) => {
  const {branchId} = route.params;
  const {branches, updateBranchStatus} = useStore();
  const branch = branches.find(b => b.id === branchId);
  const lastStatusRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncBranchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchBranchStatus(branchId);
      const newStatus = response.status;

      updateBranchStatus(branchId, newStatus);
      if (lastStatusRef.current !== newStatus) {
        await AsyncStorage.setItem('branchStatus', newStatus);
        lastStatusRef.current = newStatus;
      }
    } catch (error) {
      setError('Failed to load status. Please try again.');
      console.error('Failed to fetch branch status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, updateBranchStatus]);

  useEffect(() => {
    if (!branch || !branch.status) {
      syncBranchStatus();
    } else {
      lastStatusRef.current = branch.status;
    }
  }, [syncBranchStatus, branch]);

  const handleWelcomeClick = useCallback(async () => {
    try {
      await AsyncStorage.setItem('isOnboarded', 'true');
      navigation.replace('HomeScreen');
    } catch (error) {
      console.error('Error setting onboarded status:', error);
      navigation.replace('HomeScreen');
    }
  }, [navigation]);

  const handleRetry = useCallback(() => {
    syncBranchStatus();
  }, [syncBranchStatus]);

  if (!branch && !isLoading) {
    return <Text style={styles.text}>Loading branch data...</Text>;
  }

  return (
    <View style={styles.container}>
      {isLoading && <Text style={styles.text}>Checking status...</Text>}
      {error && (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={handleRetry} />
        </>
      )}
      {!isLoading && !error && branch && (
        <>
          <Text style={styles.text}>
            {branch.status === 'pending'
              ? 'Your branch is pending approval...'
              : `Branch Registration Status: ${branch.status}`}
          </Text>
          <Button title="Refresh" onPress={syncBranchStatus} />
          {branch.status === 'approved' && (
            <View style={styles.buttonSpacing}>
              <Button
                title="Welcome to SyncMart"
                onPress={handleWelcomeClick}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, alignItems: 'center', backgroundColor: '#f5f5f5'},
  text: {fontSize: 16, marginBottom: 20},
  errorText: {fontSize: 16, color: 'red', marginBottom: 10},
  buttonSpacing: {marginTop: 10},
});

export default StatusScreen;
