import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import {useStore} from './src/store/ordersStore';
import socketService from './src/services/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const navigationRef = React.createRef<NavigationContainerRef<any>>();

const App = () => {
  const {userId, setUserId} = useStore();

  useEffect(() => {
    const restoreUserId = async () => {
      try {
        const storedBranchId = await AsyncStorage.getItem('branchId');
        console.log('Restoring userId from AsyncStorage:', storedBranchId);
        if (storedBranchId && !userId) {
          setUserId(storedBranchId);
        }
      } catch (error) {
        console.error('Failed to restore userId from AsyncStorage:', error);
      }
    };
    restoreUserId();
  }, [userId, setUserId]);

  useEffect(() => {
    if (userId) {
      socketService.connect(userId);
      console.log('Socket connected with userId:', userId);
    }
  }, [userId]);

  return (
    <NavigationContainer ref={navigationRef}>
      <AppNavigator />
    </NavigationContainer>
  );
};

export default App;
