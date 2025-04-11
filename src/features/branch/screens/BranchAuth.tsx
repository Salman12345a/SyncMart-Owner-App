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
import DateTimePickerModal from 'react-native-modal-datetime-picker';

type BranchAuthNavigationProp = StackNavigationProp<
  RootStackParamList,
  'BranchAuth'
>;

type BranchAuthRouteProp = RouteProp<RootStackParamList, 'BranchAuth'>;

interface BranchAuthProps {
  navigation: BranchAuthNavigationProp;
  route: BranchAuthRouteProp;
}

const BranchAuth: React.FC<BranchAuthProps> = ({navigation, route}) => {
  const {branchId, isResubmit} = route.params || {};
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
  const [isLocationFetched, setIsLocationFetched] = useState(false);
  const [isOpeningTimePickerVisible, setOpeningTimePickerVisible] =
    useState(false);
  const [isClosingTimePickerVisible, setClosingTimePickerVisible] =
    useState(false);

  useEffect(() => {
    const checkLocationPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        setHasLocationPermission(granted);
        storage.set('locationPermission', granted ? 'granted' : 'denied');
      } else {
        const storedPermission = storage.getString('locationPermission');
        setHasLocationPermission(storedPermission === 'granted');
      }
    };
    checkLocationPermission();
  }, []);

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message:
              'SyncMart needs access to your location to fetch branch coordinates.',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          },
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        storage.set('locationPermission', isGranted ? 'granted' : 'denied');
        return isGranted;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const fetchCurrentLocation = useCallback(async () => {
    let permissionGranted = hasLocationPermission;
    if (!hasLocationPermission) {
      permissionGranted = await requestLocationPermission();
      setHasLocationPermission(permissionGranted);
    }

    if (!permissionGranted) {
      Alert.alert(
        'Permission Required',
        'Please grant location permission in the app settings to fetch your current location.',
        [
          {
            text: 'OK',
            onPress: () => {
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

    if (isLocationFetched) {
      Alert.alert('Info', 'Location has already been fetched.');
      return;
    }

    Alert.alert(
      'Confirm Location',
      'Are you sure you are at your shop?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => {
            setIsFetchingLocation(true);
            Geolocation.getCurrentPosition(
              position => {
                const {latitude, longitude} = position.coords;
                setForm(prev => ({
                  ...prev,
                  branchLocation: `${latitude.toFixed(6)}, ${longitude.toFixed(
                    6,
                  )}`,
                }));
                setIsLocationFetched(true);
                setIsFetchingLocation(false);
              },
              error => {
                console.error('Error getting location:', error);
                Alert.alert(
                  'Error',
                  'Could not fetch your location. Please ensure location services are enabled and try again.',
                );
                setIsFetchingLocation(false);
              },
              {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000,
              },
            );
          },
        },
      ],
      {cancelable: false},
    );
  }, [hasLocationPermission, isLocationFetched]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateGovId = (govId: string): boolean => {
    const govIdRegex = /^[a-zA-Z0-9]{5,}$/;
    return govIdRegex.test(govId);
  };

  const validatePincode = (pincode: string): boolean => {
    const pincodeRegex = /^\d{6}$/;
    return pincodeRegex.test(pincode);
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  };

  const handleOpeningTimeConfirm = (date: Date) => {
    setForm(prev => ({...prev, openingTime: formatTime(date)}));
    setOpeningTimePickerVisible(false);
  };

  const handleClosingTimeConfirm = (date: Date) => {
    setForm(prev => ({...prev, closingTime: formatTime(date)}));
    setClosingTimePickerVisible(false);
  };

  const formatData = useCallback(() => {
    if (!form.name.trim()) {
      throw new Error('Branch name is required.');
    }

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

    if (!form.street.trim()) {
      throw new Error('Street is required.');
    }

    if (!form.area.trim()) {
      throw new Error('Area is required.');
    }

    if (!form.city.trim()) {
      throw new Error('City is required.');
    }

    if (!form.pincode.trim()) {
      throw new Error('Pincode is required.');
    }

    if (!validatePincode(form.pincode)) {
      throw new Error('Please enter a valid 6-digit pincode.');
    }

    const formattedAddress = JSON.stringify({
      street: form.street.trim(),
      area: form.area.trim(),
      city: form.city.trim(),
      pincode: form.pincode.trim(),
    });

    if (form.branchEmail && !validateEmail(form.branchEmail)) {
      throw new Error('Invalid email format.');
    }

    if (!form.ownerName.trim()) {
      throw new Error('Owner name is required.');
    }

    if (!form.govId || !validateGovId(form.govId)) {
      throw new Error(
        'Please provide a valid government ID (minimum 5 characters, alphanumeric).',
      );
    }

    if (!form.openingTime || !form.closingTime) {
      throw new Error('Please select opening and closing times.');
    }

    return {
      name: form.name.trim(),
      branchLocation: formattedLocation,
      branchAddress: formattedAddress,
      branchEmail: form.branchEmail.trim(),
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      ownerName: form.ownerName.trim(),
      govId: form.govId.trim(),
      deliveryServiceAvailable: form.deliveryServiceAvailable === 'yes',
      selfPickup: form.selfPickup === 'yes',
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
        branchId,
        isResubmit,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid input format.');
    }
  }, [formatData, navigation, form, branchId, isResubmit]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Branch Registration</Text>
      <Text style={styles.subheader}>Please fill in your branch details</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch Name *</Text>
        <View style={styles.inputContainer}>
          <Icon name="store" size={20} color="#7f8c8d" style={styles.icon} />
          <TextInput
            placeholder="e.g., Ruby's Cafe"
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
                !isLocationFetched &&
                setForm(prev => ({...prev, branchLocation: text}))
              }
              style={[styles.input, isLocationFetched && styles.inputDisabled]}
              editable={!isLocationFetched}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.fetchButton,
              (!hasLocationPermission || isLocationFetched) &&
                styles.fetchButtonDisabled,
            ]}
            onPress={fetchCurrentLocation}
            disabled={
              isFetchingLocation || !hasLocationPermission || isLocationFetched
            }>
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
        {isLocationFetched && (
          <Text style={styles.infoText}>
            Location has been fetched and is now locked.
          </Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch Address *</Text>

        <View style={styles.addressFieldContainer}>
          <Text style={styles.addressLabel}>Street *</Text>
          <View style={styles.inputContainer}>
            <Icon name="home" size={20} color="#7f8c8d" style={styles.icon} />
            <TextInput
              placeholder="e.g., 2-3-4 Main Street"
              placeholderTextColor="#95a5a6"
              value={form.street}
              onChangeText={text => setForm(prev => ({...prev, street: text}))}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.addressFieldContainer}>
          <Text style={styles.addressLabel}>Area *</Text>
          <View style={styles.inputContainer}>
            <Icon name="place" size={20} color="#7f8c8d" style={styles.icon} />
            <TextInput
              placeholder="e.g., Nimboli Area"
              placeholderTextColor="#95a5a6"
              value={form.area}
              onChangeText={text => setForm(prev => ({...prev, area: text}))}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.addressFieldContainer}>
          <Text style={styles.addressLabel}>City *</Text>
          <View style={styles.inputContainer}>
            <Icon
              name="location-city"
              size={20}
              color="#7f8c8d"
              style={styles.icon}
            />
            <TextInput
              placeholder="e.g., Hyderabad"
              placeholderTextColor="#95a5a6"
              value={form.city}
              onChangeText={text => setForm(prev => ({...prev, city: text}))}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.addressFieldContainer}>
          <Text style={styles.addressLabel}>Pincode *</Text>
          <View style={styles.inputContainer}>
            <Icon name="pin" size={20} color="#7f8c8d" style={styles.icon} />
            <TextInput
              placeholder="e.g., 500027"
              placeholderTextColor="#95a5a6"
              value={form.pincode}
              onChangeText={text => setForm(prev => ({...prev, pincode: text}))}
              keyboardType="numeric"
              maxLength={6}
              style={styles.input}
            />
          </View>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch Email (optional)</Text>
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
          <TouchableOpacity
            onPress={() => setOpeningTimePickerVisible(true)}
            style={styles.timePickerButton}>
            <Text
              style={[
                styles.input,
                form.openingTime ? styles.inputText : styles.placeholderText,
              ]}>
              {form.openingTime || 'Select opening time'}
            </Text>
          </TouchableOpacity>
        </View>
        <DateTimePickerModal
          isVisible={isOpeningTimePickerVisible}
          mode="time"
          onConfirm={handleOpeningTimeConfirm}
          onCancel={() => setOpeningTimePickerVisible(false)}
        />
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
          <TouchableOpacity
            onPress={() => setClosingTimePickerVisible(true)}
            style={styles.timePickerButton}>
            <Text
              style={[
                styles.input,
                form.closingTime ? styles.inputText : styles.placeholderText,
              ]}>
              {form.closingTime || 'Select closing time'}
            </Text>
          </TouchableOpacity>
        </View>
        <DateTimePickerModal
          isVisible={isClosingTimePickerVisible}
          mode="time"
          onConfirm={handleClosingTimeConfirm}
          onCancel={() => setClosingTimePickerVisible(false)}
        />
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
            placeholder="Enter government ID (min 5 chars)"
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
        <Text style={styles.buttonText}>
          {isResubmit ? 'Next (Resubmit)' : 'Next'}
        </Text>
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
  addressFieldContainer: {
    marginBottom: 10,
  },
  addressLabel: {
    fontSize: 12,
    color: '#34495e',
    marginBottom: 4,
    fontWeight: '500',
    marginLeft: 4,
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
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#7f8c8d',
  },
  placeholderText: {
    color: '#95a5a6',
  },
  inputText: {
    color: '#2c3e50',
  },
  timePickerButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
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
  infoText: {
    fontSize: 12,
    color: '#2c3e50',
    marginTop: 5,
  },
});

export default BranchAuth;
