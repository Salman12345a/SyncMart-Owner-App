import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../../navigation/AppNavigator'; // Adjust path
import {useStore} from '../../../store/ordersStore';

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
  const {formData, branchId, isResubmit} = route.params || {};
  const {branches} = useStore();
  const branch = isResubmit ? branches.find(b => b.id === branchId) : null;

  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isResubmit && branch) {
      setPhone(branch.phone);
    } else if (formData?.phone) {
      setPhone(formData.phone);
    }
  }, [isResubmit, branch, formData]);

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
      branchId: isResubmit ? branchId : undefined,
      isResubmit: !!isResubmit,
    });

    setIsLoading(false);
  }, [phone, formData, branchId, isResubmit, navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Enter Phone Number</Text>
      <Text style={styles.subheader}>
        Please provide a contact number for the branch
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch Phone Number *</Text>
        <View style={styles.inputContainer}>
          <Icon name="phone" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="+91 1234567890"
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
        style={[
          styles.button,
          (isLoading || phone.length !== 10) && styles.buttonDisabled,
        ]}
        onPress={handleNext}
        disabled={isLoading || phone.length !== 10}>
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Text style={styles.buttonText}>
              {isResubmit ? 'Next (Resubmit)' : 'Next'}
            </Text>
            <Icon name="arrow-forward" size={20} color="white" />
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhoneNumberScreen;
