import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import SplashScreen from '../screens/SplashScreen';
import EntryScreen from '../screens/EntryScreen';
import BranchRegistrationStep1 from '../screens/BranchRegistrationStep1';
import BranchRegistrationStep2 from '../screens/BranchRegistrationStep2';
import BranchRegistrationStep3 from '../screens/BranchRegistrationStep3';
import BranchRegistrationStep4 from '../screens/BranchRegistrationStep4';
import BranchStatusScreen from '../screens/BranchStatusScreen';
import AuthenticationScreen from '../screens/AuthenticationScreen';
import HomeScreen from '../screens/HomeScreen';
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
import UploadPartnerPhoto from '../screens/UploadPartnerPhoto';
import SuccessScreen from '../screens/SuccessScreen';
import StatusScreen from '../screens/StatusScreen';
import DeliveryReRegister from '../screens/DeliveryReRegister';
import ReUploadDocuments from '../screens/ReUploadDocuments';
import ReUploadPartnerPhoto from '../screens/ReUploadPartnerPhoto';

export type RootStackParamList = {
  SplashScreen: undefined;
  EntryScreen: undefined;
  BranchRegistrationStep1: undefined;
  BranchRegistrationStep2: {step1Data: any};
  BranchRegistrationStep3: {step1Data: any; step2Data: any};
  BranchRegistrationStep4: {step1Data: any; step2Data: any; step3Data: any};
  BranchStatusScreen: {id: string; status: string};
  Authentication: undefined;
  HomeScreen: undefined;
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
  SuccessScreen: {partnerId: string; message?: string};
  StatusScreen: {id: string; status: string; name: string; photo: string};
  DeliveryReRegister: {id: string};
  ReUploadDocuments: {id: string; formData: Partial<DeliveryPartnerForm>};
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

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{headerShown: false}}
    initialRouteName="SplashScreen">
    <Stack.Screen name="SplashScreen" component={SplashScreen} />
    <Stack.Screen name="EntryScreen" component={EntryScreen} />
    <Stack.Screen name="Authentication" component={AuthenticationScreen} />
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="Main" component={Sidebar} />
    <Stack.Screen
      name="BranchRegistrationStep1"
      component={BranchRegistrationStep1}
    />
    <Stack.Screen
      name="BranchRegistrationStep2"
      component={BranchRegistrationStep2}
    />
    <Stack.Screen
      name="BranchRegistrationStep3"
      component={BranchRegistrationStep3}
    />
    <Stack.Screen
      name="BranchRegistrationStep4"
      component={BranchRegistrationStep4}
    />
    <Stack.Screen name="BranchStatusScreen" component={BranchStatusScreen} />
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
    <Stack.Screen name="StatusScreen" component={StatusScreen} />
    <Stack.Screen name="DeliveryReRegister" component={DeliveryReRegister} />
    <Stack.Screen name="ReUploadDocuments" component={ReUploadDocuments} />
    <Stack.Screen
      name="ReUploadPartnerPhoto"
      component={ReUploadPartnerPhoto}
    />
  </Stack.Navigator>
);

export default AppNavigator;
