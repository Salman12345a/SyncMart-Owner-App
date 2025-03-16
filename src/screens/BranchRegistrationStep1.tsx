import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useStore} from '../store/ordersStore';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'BranchRegistrationStep1'
>;

const BranchRegistrationStep1: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {setRegistrationFormStep} = useStore();
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    street: '',
    area: '',
    city: '',
    pincode: '',
    branchEmail: '',
    openingTime: '',
    closingTime: '',
  });

  const handleNext = () => {
    if (
      !formData.name ||
      !formData.latitude ||
      !formData.longitude ||
      !formData.street ||
      !formData.city ||
      !formData.pincode ||
      !formData.openingTime ||
      !formData.closingTime
    ) {
      alert('Please fill in all required fields');
      return;
    }
    setRegistrationFormStep('step1Data', formData);
    navigation.navigate('BranchRegistrationStep2');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Branch Details (Step 1/4)</Text>
      <TextInput
        style={styles.input}
        placeholder="Branch Name *"
        value={formData.name}
        onChangeText={text => setFormData({...formData, name: text})}
      />
      <TextInput
        style={styles.input}
        placeholder="Latitude *"
        value={formData.latitude}
        onChangeText={text => setFormData({...formData, latitude: text})}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Longitude *"
        value={formData.longitude}
        onChangeText={text => setFormData({...formData, longitude: text})}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Street *"
        value={formData.street}
        onChangeText={text => setFormData({...formData, street: text})}
      />
      <TextInput
        style={styles.input}
        placeholder="Area"
        value={formData.area}
        onChangeText={text => setFormData({...formData, area: text})}
      />
      <TextInput
        style={styles.input}
        placeholder="City *"
        value={formData.city}
        onChangeText={text => setFormData({...formData, city: text})}
      />
      <TextInput
        style={styles.input}
        placeholder="Pincode *"
        value={formData.pincode}
        onChangeText={text => setFormData({...formData, pincode: text})}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Branch Email (optional)"
        value={formData.branchEmail}
        onChangeText={text => setFormData({...formData, branchEmail: text})}
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Opening Time (e.g., 09:00) *"
        value={formData.openingTime}
        onChangeText={text => setFormData({...formData, openingTime: text})}
      />
      <TextInput
        style={styles.input}
        placeholder="Closing Time (e.g., 21:00) *"
        value={formData.closingTime}
        onChangeText={text => setFormData({...formData, closingTime: text})}
      />
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.buttonText}>Next</Text>
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
    marginBottom: 10,
  },
  nextButton: {
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

export default BranchRegistrationStep1;
