import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {sendBranchOTP, verifyBranchOTP} from '../../../services/api';

type OTPVerificationScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'OTPVerificationScreen'
>;

type OTPVerificationScreenRouteProp = RouteProp<
  RootStackParamList,
  'OTPVerificationScreen'
>;

interface OTPVerificationScreenProps {
  navigation: OTPVerificationScreenNavigationProp;
  route: OTPVerificationScreenRouteProp;
}

const OTPVerificationScreen: React.FC<OTPVerificationScreenProps> = ({
  navigation,
  route,
}) => {
  const {phone, formData, branchId, isResubmit} = route.params;
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(600); // 10 minutes in seconds
  const [resendTimer, setResendTimer] = useState(60); // 1 minute cooldown
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null]);

  // Timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prevTimer => {
        if (prevTimer <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Resend timer effect
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const handleOtpChange = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text.length === 1 && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = useCallback(async () => {
    try {
      const otpValue = otp.join('');
      if (otpValue.length !== 4) {
        setError('Please enter a valid 4-digit OTP');
        return;
      }

      setIsLoading(true);
      setError('');

      const response = await verifyBranchOTP(phone, otpValue);

      if (response.data?.verified) {
        navigation.navigate('UploadBranchDocs', {
          formData,
          initialFiles: {},
          branchId: isResubmit ? branchId : undefined,
          isResubmit: !!isResubmit,
        });
      } else {
        setError('Invalid OTP. Please try again.');
        setAttempts(prev => prev + 1);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  }, [otp, phone, formData, navigation, branchId, isResubmit]);

  const handleResendOTP = useCallback(async () => {
    if (resendTimer > 0) return;

    try {
      setIsLoading(true);
      setError('');

      await sendBranchOTP(phone);

      setResendTimer(60);
      Alert.alert('Success', 'OTP has been resent successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  }, [phone, resendTimer]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <Text style={styles.header}>Verify Phone Number</Text>
      <Text style={styles.subheader}>
        Enter the 4-digit code sent to {phone}
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => (inputRefs.current[index] = ref)}
            style={[styles.otpInput, error && styles.otpInputError]}
            value={digit}
            onChangeText={text => handleOtpChange(text, index)}
            onKeyPress={e => handleKeyPress(e, index)}
            keyboardType="numeric"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.timer}>Time remaining: {formatTime(timer)}</Text>

      <TouchableOpacity
        style={[
          styles.button,
          (isLoading || timer === 0) && styles.buttonDisabled,
        ]}
        onPress={handleVerifyOTP}
        disabled={isLoading || timer === 0}>
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Text style={styles.buttonText}>Verify OTP</Text>
            <Icon name="arrow-forward" size={20} color="white" />
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResendOTP}
        disabled={resendTimer > 0 || isLoading}>
        <Text
          style={[
            styles.resendText,
            resendTimer > 0 && styles.resendTextDisabled,
          ]}>
          {resendTimer > 0
            ? `Resend OTP in ${formatTime(resendTimer)}`
            : 'Resend OTP'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 50,
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    backgroundColor: 'white',
  },
  otpInputError: {
    borderColor: '#e74c3c',
  },
  timer: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    color: '#2980b9',
    fontSize: 16,
  },
  resendTextDisabled: {
    color: '#95a5a6',
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 15,
  },
});

export default OTPVerificationScreen;
