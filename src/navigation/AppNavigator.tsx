import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
// Common screens
import SplashScreen from '../features/common/screens/SplashScreen';
// Auth screens
import EntryScreen from '../features/auth/screens/EntryScreen';
import AuthenticationScreen from '../features/auth/screens/AuthenticationScreen';
import UserDetailsScreen from '../features/auth/screens/UserDetailsScreen';
import PhoneNumberScreen from '../features/auth/screens/PhoneNumberScreen';
// Navigation
import Sidebar from './Sidebar';
// Inventory screens
import AddProduct from '../features/inventory/screens/AddProduct';
// Financial screens
import Financial from '../features/financial/screens/FinancialSummaryScreen';
// Delivery screens
import DeliveryService from '../features/delivery/screens/DeliveryService';
import DeliveryPartnerAuth from '../features/delivery/screens/DeliveryPartnerAuth';
import UploadDocuments from '../features/delivery/screens/UploadDocuments';
import UploadPartnerPhoto from '../features/delivery/screens/UploadPartnerPhoto';
import SuccessScreen from '../features/delivery/screens/SuccessScreen';
import DeliveryStatus from '../features/delivery/screens/DeliveryStatus';
import DeliveryReRegister from '../features/delivery/screens/DeliveryReRegister';
import ReUploadDocuments from '../features/delivery/screens/ReUploadDocuments';
import ReUploadPartnerPhoto from '../features/delivery/screens/ReUploadPartnerPhoto';
// Order screens
import Order from '../features/orders/screens/OrderManagementScreen';
import OrderDetail from '../features/orders/screens/OrderDetail';
import AssignDeliveryPartner from '../features/delivery/screens/AssignDeliveryPartner';
import OrderHasPacked from '../features/orders/screens/OrderHasPacked';
import MainPackedScreen from '../features/orders/screens/MainPackedScreen';
// Branch screens
import BranchAuth from '../features/branch/screens/BranchAuth';
import UploadBranchDocs from '../features/branch/screens/UploadBranchDocs';
import StatusScreen from '../features/branch/screens/StatusScreen';

export type RootStackParamList = {
  SplashScreen: undefined;
  EntryScreen: undefined;
  OrderHistory: undefined;
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
  MainPackedScreen: undefined;
  DeliveryPartnerAuth: undefined;
  DeliveryStatus: {
    partner: {
      id: string;
      name: string;
      age: number;
      status: string;
      photoUrl: string;
    };
  };
  UploadDocuments: {formData: Partial<DeliveryPartnerForm>};
  UploadPartnerPhoto: {
    formData: Partial<DeliveryPartnerForm>;
    initialFiles: any;
  };
  SuccessScreen: {partnerId: string};
  BranchAuth: undefined;
  PhoneNumberScreen: {formData: Partial<BranchForm>};
  UploadBranchDocs: {formData: Partial<BranchForm>; initialFiles: any};
  StatusScreen: {id: string; type: 'branch' | 'delivery'};
  DeliveryReRegister: {id: string; name?: string};
  ReUploadDocuments: {
    id: string;
    formData: Partial<DeliveryPartnerForm>;
  };
  ReUploadPartnerPhoto: {
    id: string;
    formData: Partial<DeliveryPartnerForm>;
    initialFiles: any;
  };
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
    {/* Common screens */}
    <Stack.Screen name="SplashScreen" component={SplashScreen} />

    {/* Auth screens */}
    <Stack.Screen name="EntryScreen" component={EntryScreen} />
    <Stack.Screen name="Authentication" component={AuthenticationScreen} />
    <Stack.Screen name="UserDetails" component={UserDetailsScreen} />
    <Stack.Screen name="PhoneNumberScreen" component={PhoneNumberScreen} />

    {/* Navigation */}
    <Stack.Screen name="Main" component={Sidebar} />
    <Stack.Screen name="HomeScreen" component={Sidebar} />

    {/* Inventory screens */}
    <Stack.Screen name="AddProduct" component={AddProduct} />

    {/* Financial screens */}
    <Stack.Screen name="Finance" component={Financial} />

    {/* Order screens */}
    <Stack.Screen name="Order" component={Order} />
    <Stack.Screen
      name="OrderDetail"
      component={OrderDetail as React.ComponentType<any>}
    />
    <Stack.Screen
      name="OrderHasPacked"
      component={OrderHasPacked as React.ComponentType<any>}
    />
    <Stack.Screen name="MainPackedScreen" component={MainPackedScreen} />

    {/* Delivery screens */}
    <Stack.Screen
      name="DeliveryService"
      component={DeliveryService as React.ComponentType<any>}
    />
    <Stack.Screen
      name="DeliveryPartnerAuth"
      component={DeliveryPartnerAuth as React.ComponentType<any>}
    />
    <Stack.Screen
      name="DeliveryStatus"
      component={DeliveryStatus as React.ComponentType<any>}
    />
    <Stack.Screen
      name="DeliveryReRegister"
      component={DeliveryReRegister as React.ComponentType<any>}
    />
    <Stack.Screen
      name="ReUploadDocuments"
      component={ReUploadDocuments as React.ComponentType<any>}
    />
    <Stack.Screen
      name="ReUploadPartnerPhoto"
      component={ReUploadPartnerPhoto as React.ComponentType<any>}
    />
    <Stack.Screen
      name="UploadDocuments"
      component={UploadDocuments as React.ComponentType<any>}
    />
    <Stack.Screen
      name="UploadPartnerPhoto"
      component={UploadPartnerPhoto as React.ComponentType<any>}
    />
    <Stack.Screen name="SuccessScreen" component={SuccessScreen} />
    <Stack.Screen
      name="AssignDeliveryPartner"
      component={AssignDeliveryPartner as React.ComponentType<any>}
    />

    {/* Branch screens */}
    <Stack.Screen name="BranchAuth" component={BranchAuth} />
    <Stack.Screen name="UploadBranchDocs" component={UploadBranchDocs} />
    <Stack.Screen name="StatusScreen" component={StatusScreen} />
  </Stack.Navigator>
);

export default AppNavigator;
