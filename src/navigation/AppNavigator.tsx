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
import OrderPackedScreen from '../screens/OrderPackedScreen';
import DeliveryPartnerAuth from '../screens/DeliveryPartnerAuth';
import UploadDocuments from '../screens/UploadDocuments';
import UploadPartnerPhoto from '../screens/UploadPartnerPhoto'; // New import
import SuccessScreen from '../screens/SuccessScreen';

export type RootStackParamList = {
  Authentication: undefined;
  Main: undefined;
  AddProduct: undefined;
  UserDetails: undefined;
  Order: undefined;
  Finance: undefined;
  DeliveryService: undefined;
  OrderDetail: {order: Order; fromPackedTab?: boolean};
  AssignDeliveryPartner: {order: Order};
  OrderHasPacked: {order: Order};
  OrderPackedScreen: undefined;
  DeliveryPartnerAuth: undefined;
  UploadDocuments: {formData: Partial<DeliveryPartnerForm>};
  UploadPartnerPhoto: {
    formData: Partial<DeliveryPartnerForm>;
    initialFiles: any;
  };
  SuccessScreen: {partnerId: string};
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

interface DeliveryPartnerForm {
  name?: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  licenseNumber: string;
  rcNumber: string;
  phone: number;
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
    <Stack.Screen name="DeliveryPartnerAuth" component={DeliveryPartnerAuth} />
    <Stack.Screen name="UploadDocuments" component={UploadDocuments} />
    <Stack.Screen name="UploadPartnerPhoto" component={UploadPartnerPhoto} />
    <Stack.Screen name="SuccessScreen" component={SuccessScreen} />
  </Stack.Navigator>
);

export default AppNavigator;
