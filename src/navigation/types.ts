import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {Order} from '../store/ordersStore';

export type RootStackParamList = {
  HomeScreen: undefined;
  SplashScreen: undefined;
  EntryScreen: undefined;
  Authentication: undefined;
  UserDetails: undefined;
  PhoneNumberScreen: undefined;
  Main: undefined;
  AddProduct: undefined;
  Finance: undefined;
  DeliveryService: undefined;
  DeliveryPartnerAuth: undefined;
  DeliveryStatus: undefined;
  DeliveryReRegister: undefined;
  ReUploadDocuments: undefined;
  ReUploadPartnerPhoto: undefined;
  UploadDocuments: undefined;
  UploadPartnerPhoto: undefined;
  SuccessScreen: undefined;
  AssignDeliveryPartner: {order: Order};
  OrderDetail: {order: Order; fromPackedTab?: boolean};
  OrderHasPacked: undefined;
  MainPackedScreen: undefined;
  BranchAuth: undefined;
  UploadBranchDocs: undefined;
  StatusScreen: {branchId: string};
  SalesSummary: undefined;
  Order: undefined;
  Wallet: undefined;
  OrderHistory: undefined;
};

export type StatusScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'StatusScreen'
>;
export type StatusScreenRouteProp = RouteProp<
  RootStackParamList,
  'StatusScreen'
>;
