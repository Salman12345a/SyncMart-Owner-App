import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import {login} from '../../../services/api';
import {jwtDecode} from 'jwt-decode';
import {useStore} from '../../../store/ordersStore';
import {storage} from '../../../utils/storage';

type AuthNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Authentication'
>;

type JwtPayload = {
  userId: string;
  branchId: string;
  role: string;
  exp: number;
  iat: number;
};

const AuthenticationScreen: React.FC = () => {
  const navigation = useNavigation<AuthNavigationProp>();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {setUserId} = useStore();

  // Check if the phone number is already stored
  useEffect(() => {
    const checkStoredPhone = async () => {
      const storedPhone = storage.getString('branchPhone');
      if (storedPhone) {
        setPhone(storedPhone);
      }
    };
    checkStoredPhone();
  }, []);

  // Validate the phone number
  const isValidPhone = (phoneNumber: string): boolean => {
    // Basic validation - 10 digits
    return /^\d{10}$/.test(phoneNumber);
  };

  // Handle the login process
  const handleLogin = async () => {
    // Validate phone number
    if (!isValidPhone(phone)) {
      Alert.alert(
        'Invalid Input',
        'Please enter a valid 10-digit phone number',
      );
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting login with phone:', phone);
      const response = await login(phone);

      if (response && response.token) {
        // Store the phone number for future use
        storage.set('branchPhone', phone);
        storage.set('accessToken', response.token);

        // Decode the JWT token
        const decoded = jwtDecode<JwtPayload>(response.token);
        console.log('Decoded token:', decoded);

        // Store the user ID
        if (decoded.userId) {
          setUserId(decoded.userId);
          storage.set('userId', decoded.userId);
        }

        // Check if the branch is registered
        const isRegistered = storage.getBoolean('isRegistered') || false;

        // If branch is registered but not yet approved, go to status screen
        if (isRegistered && !storage.getBoolean('isApproved')) {
          const branchId = storage.getString('branchId');
          if (branchId) {
            console.log('Going to status screen for branch:', branchId);
            navigation.navigate('StatusScreen', {id: branchId, type: 'branch'});
            return;
          }
        }

        // Otherwise, go to the Home screen
        console.log('Login successful, navigating to Home');
        navigation.reset({
          index: 0,
          routes: [{name: 'HomeScreen'}],
        });
      } else {
        throw new Error('No token received');
      }
    } catch (err) {
      console.error('Login Error:', err);
      const errorMessage =
        (err as any).response?.data?.message ||
        (err as Error).message ||
        'Invalid phone number';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
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
        editable={!isLoading}
      />
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: 'white',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a8e6c1',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AuthenticationScreen;
