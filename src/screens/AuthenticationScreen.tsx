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
import {useStore} from '../store/store';
import {jwtDecode} from 'jwt-decode'; // Add this dependency

const AuthenticationScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<any>();
  const {setUserId} = useStore();

  // Check for existing token on mount
  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        try {
          const decoded: {userId: string} = jwtDecode(token);
          setUserId(decoded.userId); // Set userId in store
          navigation.replace('Main'); // Skip login if token exists
        } catch (err) {
          console.error('Token decode error:', err);
          await AsyncStorage.removeItem('accessToken'); // Clear invalid token
        }
      }
    };
    checkToken();
  }, [navigation, setUserId]);

  const handleLogin = async () => {
    console.log('Attempting login with:', {email, password});
    try {
      const response = await api.post('/auth/branch/login', {email, password});
      console.log('Login response:', response.data);
      const {accessToken} = response.data;

      // Decode token to get userId
      const decoded: {userId: string} = jwtDecode(accessToken);
      await AsyncStorage.setItem('accessToken', accessToken);
      setUserId(decoded.userId); // Store userId

      navigation.replace('Main');
    } catch (err) {
      console.error('Login Error:', err);
      const errorMessage =
        (err as any).response?.data?.message || 'Invalid credentials';
      Alert.alert('Login Failed', errorMessage);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SyncMart Branch Login</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
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
