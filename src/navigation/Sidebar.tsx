import React from 'react';
import {createDrawerNavigator} from '@react-navigation/drawer';
import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import StoreManagement from '../components/storemanage/SyncmartManagement';
import HelpScreen from '../screens/HelpScreen';

export type DrawerParamList = {
  Home: undefined;
  Wallet: undefined;
  StoreManagement: undefined;
  Help: undefined;
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
      <Drawer.Screen name="Wallet" component={WalletScreen} />
      <Drawer.Screen
        name="StoreManagement"
        component={StoreManagement}
        // Hide default header, use custom Header
      />
      <Drawer.Screen name="Help" component={HelpScreen} />
    </Drawer.Navigator>
  );
};

export default Sidebar;
