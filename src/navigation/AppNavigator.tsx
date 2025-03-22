import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import EntryScreen from '../screens/EntryScreen';
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
import UploadPartnerPhoto from '../screens/UploadPartnerPhoto'; // Added import
import SuccessScreen from '../screens/SuccessScreen';
import BranchAuth from '../screens/BranchAuth';
import PhoneNumberScreen from '../screens/PhoneNumberScreen';
import UploadBranchDocs from '../screens/UploadBranchDocs';
import StatusScreen from '../screens/StatusScreen';

export type RootStackParamList = {
  SplashScreen: undefined;
  EntryScreen: undefined;
  Authentication: undefined;
  Main: undefined;
  HomeScreen: undefined;
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
  BranchAuth: undefined;
  PhoneNumberScreen: {formData: Partial<BranchForm>};
  UploadBranchDocs: {formData: Partial<BranchForm>};
  StatusScreen: {branchId: string};
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

interface BranchForm {
  branchName: string;
  branchLocation: string;
  branchAddress: string;
  branchEmail: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  phone: string;
  homeDelivery: 'yes' | 'no';
  selfPickup: 'yes' | 'no';
}

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{headerShown: false}}
    initialRouteName="SplashScreen">
    <Stack.Screen name="SplashScreen" component={SplashScreen} />
    <Stack.Screen name="EntryScreen" component={EntryScreen} />
    <Stack.Screen name="Authentication" component={AuthenticationScreen} />
    <Stack.Screen name="Main" component={Sidebar} />
    <Stack.Screen name="HomeScreen" component={Sidebar} />
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
    <Stack.Screen name="BranchAuth" component={BranchAuth} />
    <Stack.Screen name="PhoneNumberScreen" component={PhoneNumberScreen} />
    <Stack.Screen name="UploadBranchDocs" component={UploadBranchDocs} />
    <Stack.Screen name="StatusScreen" component={StatusScreen} />
  </Stack.Navigator>
);

export default AppNavigator;
