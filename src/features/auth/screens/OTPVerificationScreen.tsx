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
  Keyboard,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/types';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {verifyOTP, sendOTP, completeLogin} from '../../../services/api';
import {config} from '../../../config';
import {storage} from '../../../utils/storage';
import {useStore} from '../../../store/ordersStore';
import {jwtDecode} from 'jwt-decode';

type OTPVerificationScreenProps = StackScreenProps<
  RootStackParamList,
  'OTPVerification'
>;

type JwtPayload = {
  userId: string;
  branchId: string;
  role: string;
  exp: number;
  iat: number;
};

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  route,
  navigation,
}) => {
  const {phone, formData, branchId, isResubmit, isLogin} = route.params || {};
  const {setUserId} = useStore();

  // OTP inputs
  const [otpValues, setOtpValues] = useState(['', '', '', '']);
  const otpInputRefs = useRef<Array<TextInput | null>>([]);

  const [isLoading, setIsLoading] = useState(false);
  // OTP Expiration: Default 10 minutes (600 seconds)
  const [timeLeft, setTimeLeft] = useState(600);
  // Resend OTP cooldown: Default 60 seconds
  const [resendDisabled, setResendDisabled] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(60);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resendTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize timers based on backend response or use defaults
  // Check if the phone number is a test number that should bypass OTP verification
  const isTestPhoneNumber = useCallback(() => {
    return (
      config.TESTING?.ENABLED &&
      config.TESTING?.TEST_PHONE_NUMBERS?.includes(phone)
    );
  }, [phone]);

  // Auto-fill OTP if it's a test phone number
  useEffect(() => {
    if (isTestPhoneNumber()) {
      console.log('Test phone number detected. Auto-filling OTP.');
      const testOtp = config.TESTING.DEFAULT_TEST_OTP || '1234';
      const otpDigits = testOtp.split('');
      // Fill in available digits
      const filledOtp = otpDigits.slice(0, 4).concat(Array(Math.max(0, 4 - otpDigits.length)).fill(''));
      setOtpValues(filledOtp);
    }
  }, [phone]);

  useEffect(() => {
    // Use stored values from backend or defaults
    const validityPeriod = storage.getNumber('otpValidityPeriod') || 600; // 10 minutes
    const retryAfter = storage.getNumber('otpRetryAfter') || 60; // 1 minute

    // Set initial values
    setTimeLeft(validityPeriod);
    setResendCountdown(retryAfter);
    setResendDisabled(true);

    startTimers();

    return () => clearTimers();
  }, []);

  const startTimers = useCallback(() => {
    // Clear any existing timers
    clearTimers();

    // Start OTP validity timer (counts down from timeLeft)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start resend countdown timer (counts down from resendCountdown)
    resendTimerRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) {
          if (resendTimerRef.current) {
            clearInterval(resendTimerRef.current);
          }
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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste event
      const pastedText = value;
      const newOtpValues = [...otpValues];

      for (let i = 0; i < Math.min(pastedText.length, 4); i++) {
        if (/^\d+$/.test(pastedText[i])) {
          newOtpValues[i] = pastedText[i];
        }
      }

      setOtpValues(newOtpValues);

      // Focus on the last filled input or the next empty one
      const lastFilledIndex = newOtpValues.findIndex(v => v === '') - 1;
      const focusIndex =
        lastFilledIndex >= 0 && lastFilledIndex < 3 ? lastFilledIndex + 1 : 3;
      otpInputRefs.current[focusIndex]?.focus();
    } else if (/^\d*$/.test(value)) {
      // Handle single digit input
      const newOtpValues = [...otpValues];
      newOtpValues[index] = value;
      setOtpValues(newOtpValues);

      // Auto focus to next input
      if (value !== '' && index < 3) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    // Handle backspace for empty inputs
    if (key === 'Backspace' && index > 0 && otpValues[index] === '') {
      const newOtpValues = [...otpValues];
      newOtpValues[index - 1] = '';
      setOtpValues(newOtpValues);
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (resendDisabled) return;

    setIsLoading(true);
    try {
      const response = await sendOTP(phone);

      if (response && response.data) {
        // Reset timers with values from the server response or use defaults
        const validityPeriod = parseInt(response.data.validityPeriod) || 600;
        const retryAfter = parseInt(response.data.retryAfter) || 60;

        // Store the values for potential future use
        storage.set('otpValidityPeriod', validityPeriod);
        storage.set('otpRetryAfter', retryAfter);

        // Reset timer states
        setTimeLeft(validityPeriod);
        setResendCountdown(retryAfter);
        setResendDisabled(true);

        // Restart the timers
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

  const handleLoginVerification = async () => {
    // Check if this is a test phone number that should bypass verification
    if (isTestPhoneNumber()) {
      console.log('Bypassing OTP verification for test phone number:', phone);
      setIsLoading(true);
      
      try {
        // Auto-verifying test phone number after delay to make it feel more realistic
        console.log('Auto-verifying test phone number after delay');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create a mock JWT token that will work with jwtDecode
        const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0X3VzZXJfaWQiLCJicmFuY2hJZCI6InRlc3RfYnJhbmNoX2lkIiwicm9sZSI6ImJyYW5jaF9vd25lciJ9.test_signature';
        const mockRefreshToken = 'test_refresh_token_' + Date.now();
        
        // For test numbers, we'll simulate a successful login response
        const mockResponse = {
          token: mockAccessToken,
          refreshToken: mockRefreshToken,
          branch: {
            _id: 'test_branch_id',
            name: 'Test Branch',
            ownerName: 'Test Owner',
            status: 'approved',
            isApproved: true,
            isRegistered: true
          }
        };
        
        // Store all required authentication data
        storage.set('accessToken', mockAccessToken);
        storage.set('refreshToken', mockRefreshToken);
        storage.set('userId', 'test_user_id');
        setUserId('test_user_id');
        storage.set('isRegistered', true);
        storage.set('isApproved', true);
        storage.set('branchId', 'test_branch_id');
        storage.set('branchName', 'Test Branch');
        storage.set('ownerName', 'Test Owner');
        storage.set('phoneNumber', phone);
        
        console.log('Stored mock accessToken and all required auth data');
        
        // Navigate to Home screen
        console.log('Test login successful, navigating to Home');
        navigation.reset({
          index: 0,
          routes: [{name: 'HomeScreen'}],
        });
        return;
      } catch (error) {
        console.error('Test login simulation error:', error);
        // Fall back to normal verification if test simulation fails
      } finally {
        setIsLoading(false);
      }
    }
    
    // Normal verification flow for non-test numbers
    const otpCode = otpValues.join('');
    if (!otpCode || otpCode.length < 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await completeLogin(phone, otpCode);

      if (response && response.token) {
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
            navigation.navigate('StatusScreen', {branchId});
            return;
          }
        }

        // Store branch data if available
        if (response.branch) {
          storage.set('isRegistered', true);

          // If branch is approved, set approved flag
          if (response.branch.status === 'approved') {
            storage.set('isApproved', true);
          }

          // Store branch ID
          if (response.branch.id) {
            storage.set('branchId', response.branch.id);
          }

          // Store branch name and owner name
          if (response.branch.name) {
            storage.set('branchName', response.branch.name);
          }

          if (response.branch.ownerName) {
            storage.set('ownerName', response.branch.ownerName);
          }
        }

        // Navigate to the Home screen
        console.log('Login successful, navigating to Home');
        navigation.reset({
          index: 0,
          routes: [{name: 'HomeScreen'}],
        });
      } else {
        throw new Error('Login verification failed');
      }
    } catch (error: any) {
      console.error('Login verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid OTP. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationVerification = async () => {
    // Check if this is a test phone number that should bypass verification
    if (isTestPhoneNumber()) {
      console.log('Bypassing OTP verification for test phone number:', phone);
      setIsLoading(true);
      
      try {
        // For test numbers, we'll simulate a successful verification response
        const mockResponse = {
          data: {
            verified: true,
            validFor: 3600 // 1 hour in seconds
          }
        };
        
        // Store verification status
        storage.set('phoneVerified', true);
        
        // Store OTP validation period
        if (mockResponse.data.validFor) {
          storage.set('otpValidFor', mockResponse.data.validFor);
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
        return;
      } catch (error) {
        console.error('Test registration verification simulation error:', error);
        // Fall back to normal verification if test simulation fails
      } finally {
        setIsLoading(false);
      }
    }
    
    // Normal verification flow for non-test numbers
    const otpCode = otpValues.join('');
    if (!otpCode || otpCode.length < 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await verifyOTP(phone, otpCode);

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

  const handleVerifyOTP = async () => {
    Keyboard.dismiss();
    if (isLogin) {
      await handleLoginVerification();
    } else {
      await handleRegistrationVerification();
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  const isOtpComplete = otpValues.every(value => value !== '');

  // Auto-verify for test phone numbers after a short delay
  useEffect(() => {
    if (isTestPhoneNumber() && isOtpComplete) {
      console.log('Auto-verifying test phone number after delay');
      const autoVerifyTimer = setTimeout(() => {
        handleVerifyOTP();
      }, 800);
      
      return () => clearTimeout(autoVerifyTimer);
    }
  }, [isTestPhoneNumber, isOtpComplete, otpValues]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Icon name="arrow-back" size={24} color="#333333" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled">
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Verification Code</Text>
          <Text style={styles.subheader}>
            We've sent a 4-digit code to {phone}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {otpValues.map((value, index) => (
            <TextInput
              key={index}
              ref={ref => (otpInputRefs.current[index] = ref)}
              style={styles.otpInput}
              value={value}
              onChangeText={text => handleOtpChange(index, text)}
              onKeyPress={({nativeEvent}) =>
                handleOtpKeyPress(index, nativeEvent.key)
              }
              keyboardType="numeric"
              maxLength={index === 0 ? 4 : 1} // First input can accept paste
              autoFocus={index === 0}
              selectionColor="#007AFF"
            />
          ))}
        </View>

        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>Resend in {formatTime(timeLeft)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!isOtpComplete || isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleVerifyOTP}
          disabled={!isOtpComplete || isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          <TouchableOpacity
            onPress={handleResendOTP}
            disabled={resendDisabled || isLoading}>
            <Text
              style={[
                styles.resendText,
                (resendDisabled || isLoading) && styles.resendTextDisabled,
              ]}>
              {resendDisabled && resendCountdown > 0
                ? `Resend in ${formatTime(resendCountdown)}`
                : 'Resend Code'}
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
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  headerContainer: {
    width: '100%',
    marginBottom: 40,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subheader: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
    paddingHorizontal: 24,
  },
  otpInput: {
    width: 60,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333333',
    backgroundColor: '#F9F9F9',
  },
  timerContainer: {
    marginBottom: 40,
  },
  timerText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#340e5c',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
    elevation: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendLabel: {
    fontSize: 14,
    color: '#666666',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  resendTextDisabled: {
    color: '#999999',
  },
});

export default OTPVerificationScreen;
