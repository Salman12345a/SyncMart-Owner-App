import React, {useEffect} from 'react';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {jwtDecode} from 'jwt-decode';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          const decoded: {userId: string} = jwtDecode(token);
          if (decoded.userId) {
            navigation.replace('HomeScreen');
            return;
          }
        }
        navigation.replace('EntryScreen');
      } catch (err) {
        console.error('Token check error:', err);
        navigation.replace('EntryScreen');
      }
    };
    checkToken();
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
