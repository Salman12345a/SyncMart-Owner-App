import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {storage} from '../utils/storage'; // MMKV

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const checkStatus = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

      const isApproved = storage.getBoolean('isApproved') || false;
      const isRegistered = storage.getBoolean('isRegistered') || false;
      const branchId = storage.getString('branchId');

      if (isApproved) {
        navigation.replace('HomeScreen');
      } else if (isRegistered && branchId) {
        navigation.replace('StatusScreen', {branchId});
      } else {
        navigation.replace('EntryScreen');
      }
    };

    checkStatus().catch(err => {
      console.error('Status check error:', err);
      navigation.replace('EntryScreen');
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DK Mart</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
});

export default SplashScreen;
