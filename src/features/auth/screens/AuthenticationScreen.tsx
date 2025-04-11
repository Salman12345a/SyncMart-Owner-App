import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import api from '../../../services/api';
import {storage} from '../../../utils/storage'; // Replace AsyncStorage with MMKV
import {useNavigation} from '@react-navigation/native';
import {useStore} from '../../../store/ordersStore';
import {jwtDecode} from 'jwt-decode';

// Define a custom interface for the JWT payload
interface TokenPayload {
  userId?: string;
  branchId?: string;
  exp?: number;
  iat?: number;
}

const AuthenticationScreen: React.FC = () => {
  const [phone, setPhone] = useState('');
  const navigation = useNavigation<any>();
  const {setUserId, sessionExpiredMessage, setSessionExpiredMessage} =
    useStore();

  useEffect(() => {
    const checkTokenAndMessage = async () => {
      const token = storage.getString('accessToken'); // Use MMKV
      if (token) {
        try {
          const decoded = jwtDecode<TokenPayload>(token);
          // Check for userId or branchId in the token
          const id = decoded.userId || decoded.branchId;
          if (id) {
            setUserId(id);
            navigation.replace('HomeScreen'); // Navigate to HomeScreen
          } else {
            console.error('No userId or branchId in token');
            storage.delete('accessToken');
          }
        } catch (err) {
          console.error('Token decode error:', err);
          storage.delete('accessToken'); // Use MMKV
        }
      }

      if (sessionExpiredMessage) {
        Alert.alert('Session Expired', sessionExpiredMessage, [
          {text: 'OK', onPress: () => setSessionExpiredMessage(null)},
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

      const decoded = jwtDecode<TokenPayload>(accessToken);
      // Get userId or branchId from token
      const id = decoded.userId || decoded.branchId;
      if (!id) {
        throw new Error('Invalid token - no user ID found');
      }

      storage.set('accessToken', accessToken); // Use MMKV
      storage.set('userId', id);
      storage.set('branchId', id); // Store as branchId too for consistency
      setUserId(id);

      // Check if branch is approved
      const isApproved =
        storage.getBoolean('isApproved') ||
        response.data.branch?.status === 'approved';
      storage.set('isApproved', isApproved);
      storage.set('isRegistered', true);

      if (isApproved) {
        navigation.replace('HomeScreen'); // Navigate to HomeScreen if approved
      } else {
        // If not approved, go to StatusScreen
        navigation.replace('StatusScreen', {branchId: id});
      }
    } catch (err) {
      console.error('Login Error:', err);
      const errorMessage =
        (err as any).response?.data?.message ||
        (err as Error).message ||
        'Invalid phone number';
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
        keyboardType="phone-pad"
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
