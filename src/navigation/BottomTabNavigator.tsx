import React, {useCallback} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import Financial from '../screens/FinancialSummaryScreen';
import Inventory from '../screens/InventoryManagementScreen';
import Order from '../screens/OrderManagementScreen';
import AddProduct from '../screens/AddProduct';
import {RootStackParamList} from '../navigation/AppNavigator';

const Tab = createBottomTabNavigator();

interface CustomTabButtonProps {
  onPress: () => void;
}

const CustomTabButton: React.FC<CustomTabButtonProps> = ({onPress}) => (
  <TouchableOpacity
    style={styles.fabContainer}
    onPress={onPress}
    activeOpacity={0.7}>
    <View style={styles.fabButton}>
      <Icon name="add" size={28} color="#fff" />
    </View>
  </TouchableOpacity>
);

type NavigationProp = StackNavigationProp<RootStackParamList, 'AddProduct'>;

const BottomTabNavigator: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleAddPress = useCallback(() => {
    navigation.navigate('AddProduct');
  }, [navigation]);

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({color, size}) => {
          const icons: {[key: string]: string} = {
            Home: 'home',
            Order: 'cart',
            Finance: 'cash',
            Inventory: 'layers',
          };
          return <Icon name={icons[route.name]} size={size} color={color} />;
        },
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#7D3CFF',
        tabBarInactiveTintColor: '#666',
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Order" component={Order} />
      <Tab.Screen
        name="Add"
        component={AddProduct}
        options={{
          tabBarButton: () => <CustomTabButton onPress={handleAddPress} />,
        }}
      />
      <Tab.Screen name="Finance" component={Financial} />
      <Tab.Screen name="Inventory" component={Inventory} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    height: 70,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 3},
    shadowRadius: 5,
  },
  fabContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7D3CFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 3},
    shadowRadius: 5,
  },
});

export default BottomTabNavigator;
