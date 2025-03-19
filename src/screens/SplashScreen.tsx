import React, {useEffect} from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {jwtDecode} from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {storage} from '../utils/storage'; // Import MMKV

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const branchStatus = storage.getString('branchStatus');
        const branchId = storage.getString('branchId');
        const token = await AsyncStorage.getItem('accessToken'); // Fallback for login flow

        if (branchStatus) {
          if (branchStatus === 'pending' || branchStatus === 'rejected') {
            navigation.replace('BranchStatusScreen', {
              id: branchId,
              status: branchStatus,
            });
          } else if (branchStatus === 'approved') {
            navigation.replace('HomeScreen');
          }
        } else if (token) {
          const decoded: {userId: string} = jwtDecode(token);
          if (decoded.userId) {
            navigation.replace('HomeScreen');
          } else {
            navigation.replace('EntryScreen');
          }
        } else {
          navigation.replace('EntryScreen');
        }
      } catch (err) {
        console.error('Status check error:', err);
        navigation.replace('EntryScreen');
      }
    };
    checkStatus();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
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
});

export default SplashScreen;
