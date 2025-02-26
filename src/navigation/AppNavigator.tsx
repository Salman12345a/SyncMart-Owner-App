import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import AuthenticationScreen from '../screens/AuthenticationScreen';
import BottomTabNavigator from './BottomTabNavigator';
import AddProduct from '../screens/AddProduct';

export type RootStackParamList = {
  Authentication: undefined;
  Main: undefined;
  AddProduct: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Authentication" component={AuthenticationScreen} />
    <Stack.Screen name="Main" component={BottomTabNavigator} />
    <Stack.Screen name="AddProduct" component={AddProduct} />
  </Stack.Navigator>
);

export default AppNavigator;
