import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import HomeScreen from '../features/orders/screens/HomeScreen';
import WalletScreen from '../features/financial/screens/WalletScreen';
import StoreManagement from '../components/storemanage/SyncmartManagement';
import HelpScreen from '../features/common/screens/HelpScreen';
import OrderHistory from '../features/orders/screens/OrderHistory';
import PrivacyPolicyScreen from '../features/common/screens/PrivacyPolicyScreen';
import TermsConditionsScreen from '../features/common/screens/TermsConditionsScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';

export type DrawerParamList = {
  Home: undefined;
  Wallet: undefined;
  StoreManagement: undefined;
  Help: undefined;
  OrderHistory: undefined;
  PrivacyPolicy: undefined;
  TermsConditions: undefined;
};

const Drawer = createDrawerNavigator<DrawerParamList>();

const Sidebar: React.FC = () => {
  return (
    <Drawer.Navigator initialRouteName="Home">
      <Drawer.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />
      <Drawer.Screen
        name="Wallet"
        component={WalletScreen}
        options={{headerShown: false}}
      />
      <Drawer.Screen
        name="StoreManagement"
        component={StoreManagement}
        // Hide default header, use custom Header
      />
      <Drawer.Screen name="Help" component={HelpScreen} />
      <Drawer.Screen
        name="OrderHistory"
        component={OrderHistory}
        options={{headerShown: false}}
      />
      <Drawer.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          title: 'Privacy Policy',
          headerShown: false,
          drawerIcon: ({color}) => (
            <Icon name="privacy-tip" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="TermsConditions"
        component={TermsConditionsScreen}
        options={{
          title: 'Terms & Conditions',
          headerShown: false,
          drawerIcon: ({color}) => (
            <Icon name="description" size={24} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

export default Sidebar;
