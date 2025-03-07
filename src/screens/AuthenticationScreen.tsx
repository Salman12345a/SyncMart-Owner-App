// src/screens/AuthenticationScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '../store/ordersStore';
import {jwtDecode} from 'jwt-decode';

const AuthenticationScreen: React.FC = () => {
  const [phone, setPhone] = useState(''); // Changed from email/password to phone
  const navigation = useNavigation<any>();
  const {setUserId, sessionExpiredMessage, setSessionExpiredMessage} =
    useStore();

  // Check token and show expiration message on mount
  useEffect(() => {
    const checkTokenAndMessage = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        try {
          const decoded: {userId: string} = jwtDecode(token);
          setUserId(decoded.userId);
          navigation.replace('Main');
        } catch (err) {
          console.error('Token decode error:', err);
          await AsyncStorage.removeItem('accessToken');
        }
      }

      // Show expiration message if it exists
      if (sessionExpiredMessage) {
        Alert.alert('Session Expired', sessionExpiredMessage, [
          {
            text: 'OK',
            onPress: () => setSessionExpiredMessage(null), // Clear message after display
          },
        ]);
      }
    };
    checkTokenAndMessage();
  }, [navigation, setUserId, sessionExpiredMessage, setSessionExpiredMessage]);

  const handleLogin = async () => {
    console.log('Attempting login with:', {phone});
    try {
      const response = await api.post('/auth/branch/login', {phone});
      console.log('Login response:', response.data);
      const {accessToken} = response.data;

      const decoded: {userId: string} = jwtDecode(accessToken);
      await AsyncStorage.setItem('accessToken', accessToken);
      setUserId(decoded.userId);

      navigation.replace('Main');
    } catch (err) {
      console.error('Login Error:', err);
      const errorMessage =
        (err as any).response?.data?.message || 'Invalid phone number';
      Alert.alert('Login Failed', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SyncMart Branch Login</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone Number"
        keyboardType="phone-pad" // Updated for phone input
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},
});

export default AuthenticationScreen;
