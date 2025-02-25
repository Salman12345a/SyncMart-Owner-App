import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import OrderManagementScreen from '../screens/OrderManagementScreen';
import InventoryManagementScreen from '../screens/InventoryManagementScreen';
import FinancialSummaryScreen from '../screens/FinancialSummaryScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({color, size}) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Orders') {
            iconName = 'basket';
          } else if (route.name === 'Inventory') {
            iconName = 'cube';
          } else if (route.name === 'Financials') {
            iconName = 'cash';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrderManagementScreen} />
      <Tab.Screen name="Inventory" component={InventoryManagementScreen} />
      <Tab.Screen name="Financials" component={FinancialSummaryScreen} />
    </Tab.Navigator>
  );
}
