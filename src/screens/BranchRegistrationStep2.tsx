import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useStore} from '../store/ordersStore';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'BranchRegistrationStep2'
>;

const BranchRegistrationStep2: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {setRegistrationFormStep} = useStore();
  const [ownerName, setOwnerName] = useState('');
  const [govId, setGovId] = useState('');
  const [deliveryServiceAvailable, setDeliveryServiceAvailable] =
    useState(false);
  const [selfPickup, setSelfPickup] = useState(false);

  const handleNext = () => {
    if (!ownerName || !govId) {
      alert('Please fill in all required fields');
      return;
    }
    const step2Data = {ownerName, govId, deliveryServiceAvailable, selfPickup};
    setRegistrationFormStep('step2Data', step2Data);
    navigation.navigate('BranchRegistrationStep3');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Owner Details (Step 2/4)</Text>
      <TextInput
        style={styles.input}
        placeholder="Owner Name *"
        value={ownerName}
        onChangeText={setOwnerName}
      />
      <TextInput
        style={styles.input}
        placeholder="Government ID *"
        value={govId}
        onChangeText={setGovId}
      />
      <View style={styles.switchContainer}>
        <Text>Home Delivery Available</Text>
        <Switch
          value={deliveryServiceAvailable}
          onValueChange={setDeliveryServiceAvailable}
        />
      </View>
      <View style={styles.switchContainer}>
        <Text>Self Pickup Available</Text>
        <Switch value={selfPickup} onValueChange={setSelfPickup} />
      </View>
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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

export default BranchRegistrationStep2;
