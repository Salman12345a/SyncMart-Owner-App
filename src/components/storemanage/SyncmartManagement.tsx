import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {DrawerNavigationProp} from '@react-navigation/drawer';
import {DrawerParamList} from '../../navigation/Sidebar';

import BottomTabNavigator from '../../navigation/BottomTabNavigator';

type InventoryScreenNavigationProp = DrawerNavigationProp<DrawerParamList>;

interface InventoryScreenProps {
  navigation: InventoryScreenNavigationProp;
}

const InventoryManagementScreen: React.FC<InventoryScreenProps> = ({
  navigation,
}) => {
  return (
    <View style={styles.container}>
      <BottomTabNavigator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InventoryManagementScreen;
