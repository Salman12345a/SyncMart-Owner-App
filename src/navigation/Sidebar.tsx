import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import HomeScreen from '../features/orders/screens/HomeScreen';
import WalletScreen from '../features/financial/screens/WalletScreen';
import StoreManagement from '../components/storemanage/SyncmartManagement';
import HelpScreen from '../features/common/screens/HelpScreen';
import OrderHistory from '../features/orders/screens/OrderHistory';

export type DrawerParamList = {
  Home: undefined;
  Wallet: undefined;
  StoreManagement: undefined;
  Help: undefined;
  OrderHistory: undefined;
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
    </Drawer.Navigator>
  );
};

export default Sidebar;
