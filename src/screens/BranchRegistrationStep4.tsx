import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {registerBranch} from '../services/api';
import {useStore} from '../store/ordersStore';
import RNFS from 'react-native-fs';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'BranchRegistrationStep4'
>;

const BranchRegistrationStep4: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {
    registrationForm,
    setStoreStatus,
    setDeliveryServiceAvailable,
    setBranch,
    clearRegistrationForm,
  } = useStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone || !/^\d{10}$/.test(phone)) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    if (
      !registrationForm.step1Data ||
      !registrationForm.step2Data ||
      !registrationForm.step3Data
    ) {
      alert(
        'Form data is incomplete. Please restart the registration process.',
      );
      return;
    }

    const latitude = parseFloat(registrationForm.step1Data!.latitude);
    const longitude = parseFloat(registrationForm.step1Data!.longitude);
    if (isNaN(latitude) || isNaN(longitude)) {
      alert('Please enter valid latitude and longitude in Step 1.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('branchName', registrationForm.step1Data!.name);
      formData.append('branchLocation', JSON.stringify({latitude, longitude}));
      formData.append(
        'branchAddress',
        JSON.stringify({
          street: registrationForm.step1Data!.street,
          area: registrationForm.step1Data!.area,
          city: registrationForm.step1Data!.city,
          pincode: registrationForm.step1Data!.pincode,
        }),
      );
      formData.append(
        'branchEmail',
        registrationForm.step1Data!.branchEmail || '',
      );
      formData.append('openingTime', registrationForm.step1Data!.openingTime);
      formData.append('closingTime', registrationForm.step1Data!.closingTime);
      formData.append('ownerName', registrationForm.step2Data!.ownerName);
      formData.append('govId', registrationForm.step2Data!.govId);
      formData.append(
        'homeDelivery',
        registrationForm.step2Data!.deliveryServiceAvailable.toString(),
      );
      formData.append(
        'selfPickup',
        registrationForm.step2Data!.selfPickup.toString(),
      );

      const files = [
        {
          key: 'branchfrontImage',
          data: registrationForm.step3Data!.branchfrontImage,
        },
        {key: 'ownerIdProof', data: registrationForm.step3Data!.ownerIdProof},
        {key: 'ownerPhoto', data: registrationForm.step3Data!.ownerPhoto},
      ];
      for (const {key, data} of files) {
        if (!data?.uri) {
          throw new Error(`Missing ${key} file data`);
        }
        const fileExists = await RNFS.exists(data.uri);
        if (!fileExists) {
          throw new Error(`File for ${key} is not accessible at ${data.uri}`);
        }
        formData.append(key, {
          uri: data.uri,
          type: data.type || 'image/webp',
          name: data.name || `${key}.webp`,
          filename: data.name || `${key}.webp`, // Explicitly add filename
        });
      }
      formData.append('phone', phone);

      console.log('Submitting FormData:', {
        branchName: registrationForm.step1Data!.name,
        branchLocation: {latitude, longitude},
        branchAddress: {
          street: registrationForm.step1Data!.street,
          area: registrationForm.step1Data!.area,
          city: registrationForm.step1Data!.city,
          pincode: registrationForm.step1Data!.pincode,
        },
        branchEmail: registrationForm.step1Data!.branchEmail || '',
        openingTime: registrationForm.step1Data!.openingTime,
        closingTime: registrationForm.step1Data!.closingTime,
        ownerName: registrationForm.step2Data!.ownerName,
        govid: registrationForm.step2Data!.govId,
        homeDelivery:
          registrationForm.step2Data!.deliveryServiceAvailable.toString(),
        selfPickup: registrationForm.step2Data!.selfPickup.toString(),
        branchfrontImage: {
          uri: registrationForm.step3Data!.branchfrontImage!.uri,
          type:
            registrationForm.step3Data!.branchfrontImage!.type || 'image/webp',
          name:
            registrationForm.step3Data!.branchfrontImage!.name ||
            'branchfrontImage.webp',
        },
        ownerIdProof: {
          uri: registrationForm.step3Data!.ownerIdProof!.uri,
          type: registrationForm.step3Data!.ownerIdProof!.type || 'image/webp',
          name:
            registrationForm.step3Data!.ownerIdProof!.name ||
            'ownerIdProof.webp',
        },
        ownerPhoto: {
          uri: registrationForm.step3Data!.ownerPhoto!.uri,
          type: registrationForm.step3Data!.ownerPhoto!.type || 'image/webp',
          name:
            registrationForm.step3Data!.ownerPhoto!.name || 'ownerPhoto.webp',
        },
        phone,
      });

      const response = await registerBranch(formData);
      if (!response.branch) throw new Error('Invalid response from server');

      setStoreStatus(response.branch.storeStatus);
      setDeliveryServiceAvailable(response.branch.deliveryServiceAvailable);
      setBranch(response.branch);
      clearRegistrationForm();
      navigation.navigate('BranchStatusScreen', {
        id: response.branch._id,
        status: response.branch.status,
      });
    } catch (error) {
      console.error('Registration failed:', error.message, error);
      let errorMessage = 'Unknown error';
      if (error.code === 'ECONNABORTED') {
        errorMessage =
          'Request timed out. Please check your network connection.';
      } else if (error.message === 'Network Error') {
        errorMessage =
          'Unable to connect to the server. Please ensure the server is running.';
      } else {
        errorMessage = error.message.includes('Request failed with status')
          ? error.message
          : error.response?.data?.error ||
            error.response?.data?.msg ||
            error.message;
      }
      alert(`Registration failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phone Number (Step 4/4)</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone Number *"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={10}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BranchRegistrationStep4;
