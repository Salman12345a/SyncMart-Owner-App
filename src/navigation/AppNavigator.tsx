import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import AuthenticationScreen from '../screens/AuthenticationScreen';
import Sidebar from './Sidebar';
import AddProduct from '../screens/AddProduct';
import UserDetailsScreen from '../screens/UserDetailsScreen';
import Financial from '../screens/FinancialSummaryScreen';
import DeliveryService from '../screens/DeliveryService';
import Order from '../screens/OrderManagementScreen';
import OrderDetail from '../screens/OrderDetail';
import AssignDeliveryPartner from '../screens/AssignDeliveryPartner';
import OrderHasPacked from '../screens/OrderHasPacked';
import OrderPackedScreen from '../screens/OrderPackedScreen'; // New

export type RootStackParamList = {
  Authentication: undefined;
  Main: undefined;
  AddProduct: undefined;
  UserDetails: undefined;
  Order: undefined;
  Finance: undefined;
  DeliveryService: undefined;
  OrderDetail: {order: Order; fromPackedTab?: boolean}; // Updated
  AssignDeliveryPartner: {order: Order};
  OrderHasPacked: {order: Order};
  OrderPackedScreen: undefined; // New
};

interface Order {
  _id: string;
  orderId: string;
  status: string;
  totalPrice: number;
  items: {_id: string; item: {name: string; price: number}; count: number}[];
  deliveryServiceAvailable?: boolean;
  modificationHistory?: {changes: string[]}[];
  customer?: string;
}

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
    <Stack.Screen name="OrderDetail" component={OrderDetail} />
    <Stack.Screen
      name="AssignDeliveryPartner"
      component={AssignDeliveryPartner}
    />
    <Stack.Screen name="OrderHasPacked" component={OrderHasPacked} />
    <Stack.Screen name="OrderPackedScreen" component={OrderPackedScreen} />
  </Stack.Navigator>
);

export default AppNavigator;
