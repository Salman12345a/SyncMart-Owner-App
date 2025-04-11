import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import {useStore} from '../../../store/ordersStore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../../navigation/AppNavigator';

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
  route,
  navigation,
}) => {
  const {formData} = route.params;
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (formData?.phone) {
      setPhone(formData.phone);
    }
  }, [formData]);

  const handleNext = useCallback(() => {
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);

    const updatedFormData = {
      ...formData,
      phone,
    };

    navigation.navigate('UploadBranchDocs', {
      formData: updatedFormData,
      initialFiles: {},
    });

    setIsLoading(false);
  }, [phone, formData, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Phone Verification</Text>
      <Text style={styles.subheader}>
        Please enter your branch's phone number
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone Number *</Text>
        <View style={styles.inputContainer}>
          <Icon name="phone" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="Enter 10-digit phone number"
            placeholderTextColor="#95a5a6"
            value={phone}
            onChangeText={setPhone}
            keyboardType="numeric"
            maxLength={10}
            style={styles.input}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleNext}
        disabled={isLoading || phone.length !== 10}>
        <Text style={styles.buttonText}>Next</Text>
        <Icon name="arrow-forward" size={20} color="white" />
      </TouchableOpacity>

      {isLoading && <Text style={styles.loadingText}>Processing...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
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
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#2c3e50',
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#7f8c8d',
    fontSize: 14,
  },
});

export default PhoneNumberScreen;
