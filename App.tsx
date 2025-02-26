import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import {StatusBar} from 'react-native';

const App: React.FC = () => (
  <>
    <StatusBar barStyle="dark-content" />
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  </>
);

export default App;
