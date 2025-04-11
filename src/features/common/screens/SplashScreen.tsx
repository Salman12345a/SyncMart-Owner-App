import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {storage} from '../../../utils/storage'; // MMKV
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const checkStatus = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

      // Request location permission
      try {
        // Check if permission status is already stored
        const storedPermission = storage.getString('locationPermission');
        if (storedPermission === 'granted') {
          // Skip request if already granted
          console.log('Location permission already granted');
        } else {
          // Request "when in use" location permission
          const permissionType =
            Platform.OS === 'ios'
              ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
              : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

          const result = await request(permissionType);

          // Store permission status in MMKV
          switch (result) {
            case RESULTS.GRANTED:
              storage.set('locationPermission', 'granted');
              console.log('Location permission granted');
              break;
            case RESULTS.DENIED:
              storage.set('locationPermission', 'denied');
              console.log('Location permission denied');
              break;
            case RESULTS.BLOCKED:
              storage.set('locationPermission', 'blocked');
              console.log('Location permission blocked');
              break;
            default:
              console.log('Unknown permission result:', result);
          }
        }
      } catch (error) {
        console.error('Location permission error:', error);
        // Proceed without storing status to avoid issues
      }

      // Existing token and status checks
      const token = storage.getString('accessToken'); // Check login token
      const isApproved = storage.getBoolean('isApproved') || false;
      const isRegistered = storage.getBoolean('isRegistered') || false;
      const branchId = storage.getString('branchId');

      if (token) {
        // If token exists, user is logged in, go to HomeScreen
        navigation.replace('HomeScreen');
      } else if (isApproved) {
        // If approved but no token (unlikely), still go to HomeScreen
        navigation.replace('HomeScreen');
      } else if (isRegistered && branchId) {
        // If registered but not approved, go to StatusScreen
        navigation.replace('StatusScreen', {branchId});
      } else {
        // Otherwise, go to EntryScreen
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
