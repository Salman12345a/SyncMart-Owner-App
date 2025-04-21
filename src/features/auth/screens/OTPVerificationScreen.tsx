import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {verifyOTP, sendOTP} from '../../../services/api';
import {storage} from '../../../utils/storage';

type OTPVerificationScreenProps = StackScreenProps<
  RootStackParamList,
  'OTPVerification'
>;

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  route,
  navigation,
}) => {
  const {phone, formData, branchId, isResubmit} = route.params || {};

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [resendDisabled, setResendDisabled] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(60); // 1 minute default

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize timers based on backend response
  useEffect(() => {
    // OTP validity period timer (from seconds to milliseconds)
    const validityPeriod = storage.getNumber('otpValidityPeriod') || 600; // 10 minutes default
    setTimeLeft(validityPeriod);

    // Resend timer (from seconds to milliseconds)
    const retryAfter = storage.getNumber('otpRetryAfter') || 60; // 1 minute default
    setResendCountdown(retryAfter);
    setResendDisabled(true);

    startTimers();

    return () => clearTimers();
  }, []);

  const startTimers = useCallback(() => {
    // Clear any existing timers
    clearTimers();

    // Start OTP validity timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start resend countdown timer
    resendTimerRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current!);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (resendTimerRef.current) {
      clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const handleResendOTP = async () => {
    if (resendDisabled) return;

    setIsLoading(true);
    try {
      const response = await sendOTP(phone);

      if (response && response.data) {
        // Reset timers
        const validityPeriod = parseInt(response.data.validityPeriod) || 600;
        const retryAfter = parseInt(response.data.retryAfter) || 60;

        storage.set('otpValidityPeriod', validityPeriod);
        storage.set('otpRetryAfter', retryAfter);

        setTimeLeft(validityPeriod);
        setResendCountdown(retryAfter);
        setResendDisabled(true);

        startTimers();

        Alert.alert('Success', 'OTP has been resent to your phone number.');
      }
    } catch (error: any) {
      console.error('Resend OTP Error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to resend OTP. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyOTP(phone, otp);

      if (response && response.data && response.data.verified) {
        // Store verification status
        storage.set('phoneVerified', true);

        // Store OTP validation period for later use if needed
        if (response.data.validFor) {
          storage.set('otpValidFor', response.data.validFor);
        }

        // Store form data for the next screen
        storage.set('branchFormData', JSON.stringify(formData));

        // Navigate to the registered branch details screen
        navigation.navigate('RegisteredBranchDetails', {
          phone,
          formData,
          branchId,
          isResubmit,
        });
      } else {
        throw new Error('OTP verification failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Verify OTP Error:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid OTP. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Verify Your Phone</Text>
        <Text style={styles.subheader}>Enter the OTP sent to {phone}</Text>

        <View style={styles.otpContainer}>
          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter OTP"
            keyboardType="numeric"
            maxLength={6}
            autoFocus
          />
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>
            OTP valid for: {formatTime(timeLeft)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={isLoading || !otp}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.buttonText}>Verify OTP</Text>
              <Icon name="check-circle" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={resendDisabled || isLoading}
            style={[
              styles.resendButton,
              (resendDisabled || isLoading) && styles.resendButtonDisabled,
            ]}>
            <Text
              style={[
                styles.resendText,
                (resendDisabled || isLoading) && styles.resendTextDisabled,
              ]}>
              Resend OTP
              {resendDisabled && resendCountdown > 0
                ? ` (${formatTime(resendCountdown)})`
                : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
  },
  otpContainer: {
    width: '100%',
    marginBottom: 24,
  },
  otpInput: {
    height: 60,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 20,
    textAlign: 'center',
    color: '#333333',
    backgroundColor: '#F9F9F9',
  },
  timerContainer: {
    marginBottom: 32,
  },
  timerText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    marginTop: 16,
  },
  resendButton: {
    padding: 12,
    borderRadius: 8,
  },
  resendButtonDisabled: {
    opacity: 0.7,
  },
  resendText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
  resendTextDisabled: {
    color: '#999999',
  },
});

export default OTPVerificationScreen;
