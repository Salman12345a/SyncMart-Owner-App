import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';

export type RootStackParamList = {
  Status: {
    branchId: string;
  };
  HomeScreen: {
    userId: string;
  };
  // Add other screen params as needed
};

export type StatusScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Status'>;
export type StatusScreenRouteProp = RouteProp<RootStackParamList, 'Status'>;
