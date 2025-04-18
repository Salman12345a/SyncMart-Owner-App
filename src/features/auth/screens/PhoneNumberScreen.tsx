import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import CountryPicker, {
  Country,
  CountryCode,
} from 'react-native-country-picker-modal';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';

type PhoneNumberScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'PhoneNumberScreen'
>;

type PhoneNumberScreenRouteProp = RouteProp<
  RootStackParamList,
  'PhoneNumberScreen'
>;

interface PhoneNumberScreenProps {
  navigation: PhoneNumberScreenNavigationProp;
  route: PhoneNumberScreenRouteProp;
}

const PhoneNumberScreen: React.FC<PhoneNumberScreenProps> = ({
  navigation,
  route,
}) => {
  const {formData} = route.params;
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState<CountryCode>('IN');
  const [callingCode, setCallingCode] = useState('91');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    setShowCountryPicker(false);
  };

  const validatePhoneNumber = (number: string) => {
    // Remove any non-digit characters
    const cleanNumber = number.replace(/\D/g, '');

    // Basic validation for Indian numbers (can be expanded for other countries)
    if (countryCode === 'IN' && cleanNumber.length !== 10) {
      return false;
    }

    return true;
  };

  const handleSubmit = useCallback(async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Remove any non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    if (!validatePhoneNumber(cleanNumber)) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      // Format phone number with country code
      const formattedPhoneNumber = `+${callingCode}${cleanNumber}`;

      // Update form data with formatted phone number
      const updatedFormData = {
        ...formData,
        phone: formattedPhoneNumber,
      };

      navigation.navigate('UploadBranchDocs', {
        formData: updatedFormData,
        initialFiles: {},
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to process phone number');
      console.error('Phone number error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [phoneNumber, callingCode, formData, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Enter Phone Number</Text>
      <Text style={styles.subheader}>
        Please enter your phone number to proceed with registration
      </Text>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.countryPickerButton}
          onPress={() => setShowCountryPicker(true)}>
          <CountryPicker
            countryCode={countryCode}
            withFilter
            withFlag
            withCallingCode
            withCallingCodeButton
            withAlphaFilter
            onSelect={onSelectCountry}
            visible={showCountryPicker}
            onClose={() => setShowCountryPicker(false)}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
          maxLength={10}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Text style={styles.buttonText}>Continue</Text>
            <Icon name="arrow-forward" size={20} color="white" />
          </>
        )}
      </TouchableOpacity>
    </View>
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
    marginTop: 40,
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  countryPickerButton: {
    marginRight: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcdde1',
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dcdde1',
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
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhoneNumberScreen;
