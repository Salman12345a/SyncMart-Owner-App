import React, {useState, useCallback} from 'react';
import {View, TextInput, Button, Text, StyleSheet, Alert} from 'react-native';
import {Picker} from '@react-native-picker/picker';

const BranchAuth: React.FC = ({navigation, route}) => {
  const {branchId, isResubmit} = route.params || {};
  const [form, setForm] = useState({
    name: '',
    branchLocation: '',
    branchAddress: '',
    branchEmail: '',
    openingTime: '',
    closingTime: '',
    ownerName: '',
    govId: '',
    deliveryServiceAvailable: 'yes' as 'yes' | 'no',
    selfPickup: 'yes' as 'yes' | 'no',
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const formatData = useCallback(() => {
    const locationParts = form.branchLocation
      .split(',')
      .map(part => part.trim());
    if (
      locationParts.length !== 2 ||
      isNaN(Number(locationParts[0])) ||
      isNaN(Number(locationParts[1]))
    ) {
      throw new Error(
        'Invalid branch location format. Please enter latitude and longitude separated by a comma (e.g., 12.34, 56.78).',
      );
    }
    const formattedLocation = JSON.stringify({
      latitude: Number(locationParts[0]),
      longitude: Number(locationParts[1]),
    });

    const addressParts = form.branchAddress.split(',').map(part => part.trim());
    if (addressParts.length < 4) {
      throw new Error(
        'Invalid branch address format. Please enter street, area, city, and pincode separated by commas.',
      );
    }
    const formattedAddress = JSON.stringify({
      street: addressParts[0],
      area: addressParts[1],
      city: addressParts[2],
      pincode: addressParts[3],
    });

    if (form.branchEmail && !validateEmail(form.branchEmail)) {
      throw new Error('Invalid email format.');
    }

    return {
      name: form.name,
      branchLocation: formattedLocation,
      branchAddress: formattedAddress,
      branchEmail: form.branchEmail,
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      ownerName: form.ownerName,
      govId: form.govId,
      deliveryServiceAvailable: form.deliveryServiceAvailable === 'yes',
      selfPickup: form.selfPickup === 'yes',
    };
  }, [form]);

  const handleNext = useCallback(() => {
    try {
      if (
        !form.name ||
        !form.branchLocation ||
        !form.branchAddress ||
        !form.openingTime ||
        !form.closingTime ||
        !form.ownerName ||
        !form.govId
      ) {
        Alert.alert('Error', 'Please fill all required fields.');
        return;
      }

      const formattedData = formatData();
      navigation.navigate('PhoneNumberScreen', {
        formData: formattedData,
        branchId,
        isResubmit,
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'Invalid input format.');
    }
  }, [formatData, navigation, form, isResubmit, branchId]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Branch Name *"
        value={form.name}
        onChangeText={text => setForm(prev => ({...prev, name: text}))}
        style={styles.input}
      />
      <TextInput
        placeholder="Branch Location (latitude, longitude) *"
        value={form.branchLocation}
        onChangeText={text =>
          setForm(prev => ({...prev, branchLocation: text}))
        }
        style={styles.input}
      />
      <TextInput
        placeholder="Branch Address (street, area, city, pincode) *"
        value={form.branchAddress}
        onChangeText={text => setForm(prev => ({...prev, branchAddress: text}))}
        style={styles.input}
      />
      <TextInput
        placeholder="Branch Email (optional)"
        value={form.branchEmail}
        onChangeText={text => setForm(prev => ({...prev, branchEmail: text}))}
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Opening Time (e.g., 09:00 AM) *"
        value={form.openingTime}
        onChangeText={text => setForm(prev => ({...prev, openingTime: text}))}
        style={styles.input}
      />
      <TextInput
        placeholder="Closing Time (e.g., 06:00 PM) *"
        value={form.closingTime}
        onChangeText={text => setForm(prev => ({...prev, closingTime: text}))}
        style={styles.input}
      />
      <TextInput
        placeholder="Owner Name *"
        value={form.ownerName}
        onChangeText={text => setForm(prev => ({...prev, ownerName: text}))}
        style={styles.input}
      />
      <TextInput
        placeholder="Government ID *"
        value={form.govId}
        onChangeText={text => setForm(prev => ({...prev, govId: text}))}
        style={styles.input}
      />
      <Text style={styles.label}>Delivery Service Available *</Text>
      <Picker
        selectedValue={form.deliveryServiceAvailable}
        onValueChange={value =>
          setForm(prev => ({...prev, deliveryServiceAvailable: value}))
        }>
        <Picker.Item label="Yes" value="yes" />
        <Picker.Item label="No" value="no" />
      </Picker>
      <Text style={styles.label}>Self Pickup *</Text>
      <Picker
        selectedValue={form.selfPickup}
        onValueChange={value =>
          setForm(prev => ({...prev, selfPickup: value}))
        }>
        <Picker.Item label="Yes" value="yes" />
        <Picker.Item label="No" value="no" />
      </Picker>
      <Button
        title={isResubmit ? 'Next (Resubmit)' : 'Next'}
        onPress={handleNext}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, backgroundColor: '#f5f5f5'},
  input: {borderBottomWidth: 1, marginBottom: 10, padding: 8},
  label: {marginVertical: 10, fontWeight: 'bold'},
});

export default BranchAuth;
