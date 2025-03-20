import React, {useEffect} from 'react';
import {View, Text} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SplashScreen: React.FC = ({navigation}) => {
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const branchId = await AsyncStorage.getItem('branchId');
        const branchStatus = await AsyncStorage.getItem('branchStatus');
        const isOnboarded = await AsyncStorage.getItem('isOnboarded');

        if (isOnboarded === 'true') {
          navigation.replace('HomeScreen');
        } else if (branchId && branchStatus === 'pending') {
          navigation.replace('StatusScreen', {branchId});
        } else {
          navigation.replace('EntryScreen');
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
        navigation.replace('EntryScreen'); // Fallback to EntryScreen on error
      }
    };

    // Always show splash screen for 2 seconds on every app start
    const timer = setTimeout(checkRegistrationStatus, 2000);
    return () => clearTimeout(timer);
  }, [navigation]); // Dependency on navigation ensures this runs only once per mount

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
      }}>
      <Text style={{fontSize: 24, fontWeight: 'bold'}}>SyncMart</Text>
    </View>
  );
};

export default SplashScreen;
