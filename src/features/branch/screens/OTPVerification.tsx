import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import api from '../../../services/api';
import {useStore} from '../../../store/ordersStore';
import {storage} from '../../../utils/storage';

type OTPVerificationNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OTPVerification'
>;

type OTPVerificationRouteProp = RouteProp<
  RootStackParamList,
  'OTPVerification'
>;

interface OTPVerificationProps {
  navigation: OTPVerificationNavigationProp;
  route: OTPVerificationRouteProp;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  navigation,
  route,
}) => {
  const {phone, token, branchId} = route.params;
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const {addBranch, setUserId} = useStore();

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/branch/verify-otp', {
        phone,
        otp,
        token,
      });

      if (response.data.success) {
        // Get the stored pending branch data
        const pendingDataStr = storage.getString('pendingBranchData');
        if (!pendingDataStr) {
          throw new Error('Registration data not found');
        }

        const pendingData = JSON.parse(pendingDataStr);
        const {branchData, formData} = pendingData;

        // Complete the registration process
        const loginResponse = await api.post('/auth/branch/login', {
          phone: formData.phone,
        });

        const accessToken = loginResponse.data.accessToken;

        // Store necessary data
        await AsyncStorage.setItem('userId', branchId);
        await AsyncStorage.setItem('accessToken', accessToken);
        setUserId(branchId);

        // Add branch to store
        addBranch({
          id: branchId,
          status: branchData.status || 'pending',
          name: branchData.name,
          phone: formData.phone,
          address: formData.address,
          location: formData.location,
          branchEmail: branchData.branchEmail,
          openingTime: branchData.openingTime,
          closingTime: branchData.closingTime,
          ownerName: branchData.ownerName,
          govId: branchData.govId,
          deliveryServiceAvailable: branchData.deliveryServiceAvailable,
          selfPickup: branchData.selfPickup,
          branchfrontImage: branchData.branchfrontImage,
          ownerIdProof: branchData.ownerIdProof,
          ownerPhoto: branchData.ownerPhoto,
        });

        // Set registration status
        storage.set('isRegistered', true);
        storage.set('branchId', branchId);
        storage.set('isApproved', branchData.status === 'approved');

        // Clean up temporary data
        storage.delete('pendingBranchData');

        // Navigate to status screen
        navigation.replace('StatusScreen', {
          id: branchId,
          type: 'branch',
        });
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to verify OTP',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/branch/send-otp', {
        phone,
      });
      Alert.alert('Success', 'OTP sent successfully');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send OTP',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Verify Your Phone Number</Text>
      <Text style={styles.subheader}>Enter the OTP sent to {phone}</Text>

      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={setOtp}
        placeholder="Enter OTP"
        keyboardType="number-pad"
        maxLength={6}
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResendOTP}
        disabled={isLoading}>
        <Text style={styles.resendText}>Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dcdde1',
  },
  button: {
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendText: {
    color: '#3498db',
    fontSize: 14,
  },
});

export default OTPVerification;
