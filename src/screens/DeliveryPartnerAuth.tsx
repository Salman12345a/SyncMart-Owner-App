import React, {useState} from 'react';
import {View, TextInput, Button, Text} from 'react-native';
import {Picker} from '@react-native-picker/picker';

const DeliveryPartnerAuth: React.FC = ({navigation}) => {
  console.log('Rendering DeliveryPartnerAuth');

  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'male',
    licenseNumber: '',
    rcNumber: '',
    phone: '',
  });

  const handleNext = () => {
    console.log('Navigating to UploadDocuments with form:', form);
    navigation.navigate('UploadDocuments', {
      formData: {
        name: form.name,
        age: form.age ? parseInt(form.age) : 0,
        gender: form.gender as 'male' | 'female' | 'other',
        licenseNumber: form.licenseNumber,
        rcNumber: form.rcNumber,
        phone: form.phone ? parseInt(form.phone) : 0,
      },
    });
  };

  return (
    <View style={{padding: 20}}>
      <TextInput
        placeholder="Name (optional)"
        value={form.name}
        onChangeText={text => setForm({...form, name: text})}
        style={{borderBottomWidth: 1, marginBottom: 10}}
      />
      <TextInput
        placeholder="Age"
        value={form.age}
        onChangeText={text => setForm({...form, age: text})}
        keyboardType="numeric"
        style={{borderBottomWidth: 1, marginBottom: 10}}
      />
      <Text>Gender: {form.gender}</Text> {/* Fallback */}
      <Button
        title="Set Male"
        onPress={() => setForm({...form, gender: 'male'})}
      />
      <Button
        title="Set Female"
        onPress={() => setForm({...form, gender: 'female'})}
      />
      <Button
        title="Set Other"
        onPress={() => setForm({...form, gender: 'other'})}
      />
      <TextInput
        placeholder="License Number"
        value={form.licenseNumber}
        onChangeText={text => setForm({...form, licenseNumber: text})}
        style={{borderBottomWidth: 1, marginBottom: 10}}
      />
      <TextInput
        placeholder="RC Number"
        value={form.rcNumber}
        onChangeText={text => setForm({...form, rcNumber: text})}
        style={{borderBottomWidth: 1, marginBottom: 10}}
      />
      <TextInput
        placeholder="Phone"
        value={form.phone}
        onChangeText={text => setForm({...form, phone: text})}
        keyboardType="numeric"
        style={{borderBottomWidth: 1, marginBottom: 10}}
      />
      <Button title="Next" onPress={handleNext} />
    </View>
  );
};

export default DeliveryPartnerAuth;
