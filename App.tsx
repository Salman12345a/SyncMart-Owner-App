import 'react-native-gesture-handler';
import React, {useEffect} from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import {useStore} from './src/store/ordersStore'; // Updated import
import socketService from './src/services/socket'; // New service

export const navigationRef = React.createRef<NavigationContainerRef<any>>();

const App = () => {
  const {userId} = useStore();

  useEffect(() => {
    if (userId) {
      socketService.connect(userId); // Initialize Socket.IO with branch ID
    }
  }, [userId]);

  return (
    <NavigationContainer ref={navigationRef}>
      <AppNavigator />
    </NavigationContainer>
  );
};

export default App;
