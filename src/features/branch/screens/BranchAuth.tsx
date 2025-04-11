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
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import Geolocation from '@react-native-community/geolocation';
import {storage} from '../../../utils/storage';

type BranchAuthNavigationProp = StackNavigationProp<
  RootStackParamList,
  'BranchAuth'
>;

type BranchAuthRouteProp = RouteProp<RootStackParamList, 'BranchAuth'>;

interface BranchAuthProps {
  navigation: BranchAuthNavigationProp;
  route: BranchAuthRouteProp;
}

const BranchAuth: React.FC<BranchAuthProps> = ({navigation}) => {
  const [form, setForm] = useState({
    name: '',
    branchLocation: '',
    street: '',
    area: '',
    city: '',
    pincode: '',
    branchEmail: '',
    openingTime: '',
    closingTime: '',
    ownerName: '',
    govId: '',
    deliveryServiceAvailable: 'yes' as 'yes' | 'no',
    selfPickup: 'yes' as 'yes' | 'no',
  });

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  useEffect(() => {
    // Check stored permission status
    const storedPermission = storage.getString('locationPermission');
    setHasLocationPermission(storedPermission === 'granted');
  }, []);

  const fetchCurrentLocation = useCallback(() => {
    if (!hasLocationPermission) {
      Alert.alert(
        'Permission Required',
        'Please grant location permission in the app settings to fetch your current location.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to settings or show instructions
              Alert.alert(
                'Location Permission',
                'Please go to your device settings and enable location permission for SyncMart.',
              );
            },
          },
        ],
      );
      return;
    }

    setIsFetchingLocation(true);
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        setForm(prev => ({
          ...prev,
          branchLocation: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        }));
        setIsFetchingLocation(false);
      },
      error => {
        console.error('Error getting location:', error);
        Alert.alert(
          'Error',
          'Could not fetch your location. Please make sure location services are enabled and try again.',
        );
        setIsFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  }, [hasLocationPermission]);

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

    if (!form.street || !form.area || !form.city || !form.pincode) {
      throw new Error('Please fill in all address fields.');
    }

    const formattedAddress = JSON.stringify({
      street: form.street,
      area: form.area,
      city: form.city,
      pincode: form.pincode,
    });

    if (form.branchEmail && !validateEmail(form.branchEmail)) {
      throw new Error('Invalid email format.');
    }

    return {
      branchName: form.name,
      branchLocation: formattedLocation,
      branchAddress: formattedAddress,
      branchEmail: form.branchEmail,
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      ownerName: form.ownerName,
      govId: form.govId,
      homeDelivery: form.deliveryServiceAvailable,
      selfPickup: form.selfPickup,
    };
  }, [form]);

  const handleNext = useCallback(() => {
    try {
      if (
        !form.name ||
        !form.branchLocation ||
        !form.street ||
        !form.area ||
        !form.city ||
        !form.pincode ||
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
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid input format.');
    }
  }, [formatData, navigation, form]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Branch Registration</Text>
      <Text style={styles.subheader}>Please fill in your branch details</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch Name *</Text>
        <View style={styles.inputContainer}>
          <Icon name="store" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="Enter branch name"
            placeholderTextColor="#95a5a6"
            value={form.name}
            onChangeText={text => setForm(prev => ({...prev, name: text}))}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>
          Branch Location (latitude, longitude) *
        </Text>
        <View style={styles.locationContainer}>
          <View style={styles.inputWrapper}>
            <Icon
              name="location-on"
              size={20}
              color="#7f8c8d"
              style={styles.icon}
            />
            <TextInput
              placeholder="e.g., 12.34, 56.78"
              placeholderTextColor="#95a5a6"
              value={form.branchLocation}
              onChangeText={text =>
                setForm(prev => ({...prev, branchLocation: text}))
              }
              style={styles.input}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.fetchButton,
              !hasLocationPermission && styles.fetchButtonDisabled,
            ]}
            onPress={fetchCurrentLocation}
            disabled={isFetchingLocation || !hasLocationPermission}>
            {isFetchingLocation ? (
              <ActivityIndicator color="#2ecc71" />
            ) : (
              <Icon name="my-location" size={20} color="#2ecc71" />
            )}
          </TouchableOpacity>
        </View>
        {!hasLocationPermission && (
          <Text style={styles.permissionText}>
            Location permission is required to fetch your current location.
            Please enable it in your device settings.
          </Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Street Address *</Text>
        <View style={styles.inputContainer}>
          <Icon name="home" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="Enter street address"
            placeholderTextColor="#95a5a6"
            value={form.street}
            onChangeText={text => setForm(prev => ({...prev, street: text}))}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Area/Locality *</Text>
        <View style={styles.inputContainer}>
          <Icon name="place" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="Enter area or locality"
            placeholderTextColor="#95a5a6"
            value={form.area}
            onChangeText={text => setForm(prev => ({...prev, area: text}))}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>City *</Text>
        <View style={styles.inputContainer}>
          <Icon
            name="location-city"
            size={20}
            color="#7f8c8d"
            style={styles.icon}
          />
          <TextInput
            placeholder="Enter city"
            placeholderTextColor="#95a5a6"
            value={form.city}
            onChangeText={text => setForm(prev => ({...prev, city: text}))}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Pincode *</Text>
        <View style={styles.inputContainer}>
          <Icon
            name="markunread-mailbox"
            size={20}
            color="#7f8c8d"
            style={styles.icon}
          />
          <TextInput
            placeholder="Enter pincode"
            placeholderTextColor="#95a5a6"
            value={form.pincode}
            onChangeText={text => setForm(prev => ({...prev, pincode: text}))}
            keyboardType="numeric"
            maxLength={6}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch Email</Text>
        <View style={styles.inputContainer}>
          <Icon name="email" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="Enter email address"
            placeholderTextColor="#95a5a6"
            value={form.branchEmail}
            onChangeText={text =>
              setForm(prev => ({...prev, branchEmail: text}))
            }
            keyboardType="email-address"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Opening Time *</Text>
        <View style={styles.inputContainer}>
          <Icon
            name="access-time"
            size={20}
            color="#7f8c8d"
            style={styles.icon}
          />
          <TextInput
            placeholder="e.g., 09:00 AM"
            placeholderTextColor="#95a5a6"
            value={form.openingTime}
            onChangeText={text =>
              setForm(prev => ({...prev, openingTime: text}))
            }
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Closing Time *</Text>
        <View style={styles.inputContainer}>
          <Icon
            name="access-time"
            size={20}
            color="#7f8c8d"
            style={styles.icon}
          />
          <TextInput
            placeholder="e.g., 06:00 PM"
            placeholderTextColor="#95a5a6"
            value={form.closingTime}
            onChangeText={text =>
              setForm(prev => ({...prev, closingTime: text}))
            }
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Owner Name *</Text>
        <View style={styles.inputContainer}>
          <Icon name="person" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="Enter owner name"
            placeholderTextColor="#95a5a6"
            value={form.ownerName}
            onChangeText={text => setForm(prev => ({...prev, ownerName: text}))}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Government ID *</Text>
        <View style={styles.inputContainer}>
          <Icon name="badge" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="Enter government ID"
            placeholderTextColor="#95a5a6"
            value={form.govId}
            onChangeText={text => setForm(prev => ({...prev, govId: text}))}
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Delivery Service Available *</Text>
        <View style={[styles.inputContainer, styles.pickerContainer]}>
          <Icon
            name="local-shipping"
            size={20}
            color="#7f8c8d"
            style={styles.icon}
          />
          <Picker
            selectedValue={form.deliveryServiceAvailable}
            onValueChange={value =>
              setForm(prev => ({...prev, deliveryServiceAvailable: value}))
            }
            style={styles.picker}
            dropdownIconColor="#7f8c8d">
            <Picker.Item label="Yes" value="yes" />
            <Picker.Item label="No" value="no" />
          </Picker>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Self Pickup *</Text>
        <View style={[styles.inputContainer, styles.pickerContainer]}>
          <Icon
            name="shopping-cart"
            size={20}
            color="#7f8c8d"
            style={styles.icon}
          />
          <Picker
            selectedValue={form.selfPickup}
            onValueChange={value =>
              setForm(prev => ({...prev, selfPickup: value}))
            }
            style={styles.picker}
            dropdownIconColor="#7f8c8d">
            <Picker.Item label="Yes" value="yes" />
            <Picker.Item label="No" value="no" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Next</Text>
        <Icon name="arrow-forward" size={20} color="white" />
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
  pickerContainer: {
    height: 50,
    justifyContent: 'center',
  },
  picker: {
    flex: 1,
    color: '#2c3e50',
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
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ecf0f1',
    paddingHorizontal: 12,
  },
  fetchButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ecf0f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fetchButtonDisabled: {
    opacity: 0.5,
  },
  permissionText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 5,
  },
});

export default BranchAuth;
