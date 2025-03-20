import React from 'react';
import {View, Button, StyleSheet} from 'react-native';

const EntryScreen: React.FC = ({navigation}) => {
  return (
    <View style={styles.container}>
      <Button
        title="Login"
        onPress={() => navigation.navigate('Authentication')}
      />
      <View style={styles.buttonSpacing} />
      <Button
        title="Registration"
        onPress={() => navigation.navigate('BranchAuth')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  buttonSpacing: {
    marginTop: 20,
  },
});

export default EntryScreen;
