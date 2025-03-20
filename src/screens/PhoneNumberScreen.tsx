import React, {useState, useCallback} from 'react';
import {View, TextInput, Button, StyleSheet, Alert, Text} from 'react-native';

const PhoneNumberScreen: React.FC = ({route, navigation}) => {
  const {formData} = route.params;
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = useCallback(() => {
    // Validate phone number
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);

    // Update formData with the phone number
    const updatedFormData = {
      ...formData,
      phone,
    };

    // Navigate to the next screen
    navigation.navigate('UploadBranchDocs', {
      formData: updatedFormData,
    });

    setIsLoading(false);
  }, [phone, formData, navigation]);

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Branch Phone Number (e.g., 1234567890)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="numeric"
        maxLength={10} // Restrict input to 10 digits
        style={styles.input}
      />
      <Button
        title="Next"
        onPress={handleNext}
        disabled={isLoading || phone.length !== 10} // Disable if phone number is invalid
      />
      {isLoading && <Text style={styles.text}>Loading...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, backgroundColor: '#f5f5f5'},
  input: {borderBottomWidth: 1, marginBottom: 10, padding: 8},
  text: {marginTop: 10},
});

export default PhoneNumberScreen;
