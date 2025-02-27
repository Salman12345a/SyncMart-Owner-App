import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import AuthenticationScreen from '../screens/AuthenticationScreen';
import Sidebar from './Sidebar';
import AddProduct from '../screens/AddProduct';
import UserDetailsScreen from '../screens/UserDetailsScreen';
import Financial from '../screens/FinancialSummaryScreen';
import DeliveryService from '../screens/DeliveryService';
import Order from '../screens/OrderManagementScreen';

export type RootStackParamList = {
  Authentication: undefined;
  Main: undefined;
  AddProduct: undefined;
  UserDetails: undefined;
  Order: undefined;
  Finance: undefined;
  DeliveryService: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{headerShown: false}}>
    <Stack.Screen name="Authentication" component={AuthenticationScreen} />
    <Stack.Screen name="Main" component={Sidebar} />
    <Stack.Screen name="AddProduct" component={AddProduct} />
    <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
    <Stack.Screen name="Order" component={Order} />
    <Stack.Screen name="Finance" component={Financial} />
    <Stack.Screen name="DeliveryService" component={DeliveryService} />
  </Stack.Navigator>
);

export default AppNavigator;
