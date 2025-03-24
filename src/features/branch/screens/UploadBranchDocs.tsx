import React, {useState, useCallback, useEffect} from 'react';
import {View, Button, Text, StyleSheet, Alert} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {StackNavigationProp} from '@react-navigation/stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import {registerBranch} from '../../../services/api';
import api from '../../../services/api';
import {useStore} from '../../../store/ordersStore';
import {storage} from '../../../utils/storage';

type UploadBranchDocsNavigationProp = StackNavigationProp<
  RootStackParamList,
  'UploadBranchDocs'
>;

type UploadBranchDocsRouteProp = RouteProp<
  RootStackParamList,
  'UploadBranchDocs'
>;

interface UploadBranchDocsProps {
  navigation: UploadBranchDocsNavigationProp;
  route: UploadBranchDocsRouteProp;
}

// Define the Asset type for the image picker
interface Asset {
  uri: string;
  type?: string;
  name?: string;
  size?: number;
}

// Define Branch interface with strict status type
interface Branch {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  address: {
    street: string;
    area: string;
    city: string;
    pincode: string;
  };
  location: {
    type: string;
    coordinates: [number, number];
  };
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  phone: string;
  branchfrontImage: string;
  ownerIdProof: string;
  ownerPhoto: string;
  deliveryServiceAvailable: boolean;
  selfPickup: boolean;
}

// Define a more flexible branch interface for internal use
interface BranchInternal {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  name: string;
  address: {
    street: string;
    area: string;
    city: string;
    pincode: string;
  };
  location: {
    type: string;
    coordinates: [number, number];
  };
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  phone: string;
  branchfrontImage?: string;
  ownerIdProof?: string;
  ownerPhoto?: string;
  deliveryServiceAvailable: boolean;
  selfPickup: boolean;
}

// Define route params interface
interface UploadBranchDocsRouteParams {
  formData: BranchFormData | string;
  initialFiles?: any;
  branchId?: string;
  isResubmit?: boolean;
}

// Form data structure
interface BranchFormData {
  branchName: string;
  branchLocation: {
    latitude: number;
    longitude: number;
  };
  branchAddress: {
    street: string;
    area: string;
    city: string;
    pincode: string;
  };
  branchEmail?: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  phone: string;
  homeDelivery: 'yes' | 'no';
  selfPickup: 'yes' | 'no';
}

// Define the structure expected by the registerBranch function
interface RegisterBranchData {
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  address: {
    street: string;
    area: string;
    city: string;
    pincode: string;
  };
  branchEmail?: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  phone: string;
  deliveryServiceAvailable: boolean;
  selfPickup: boolean;
  branchfrontImage: {
    uri: string;
    type: string;
    name: string;
  };
  ownerIdProof: {
    uri: string;
    type: string;
    name: string;
  };
  ownerPhoto: {
    uri: string;
    type: string;
    name: string;
  };
}

const UploadBranchDocs: React.FC<UploadBranchDocsProps> = ({route, navigation}) => {
  // Extract and parse params with proper type assertion
  const rawParams = route.params as unknown as UploadBranchDocsRouteParams || {};
  const branchId = rawParams.branchId;
  const isResubmit = rawParams.isResubmit;
  
  // Parse formData if it's a string
  let parsedFormData: Partial<BranchFormData> = {};
  if (typeof rawParams.formData === 'string') {
    try {
      parsedFormData = JSON.parse(rawParams.formData);
    } catch (e) {
      console.error('Error parsing formData:', e);
    }
  } else if (rawParams.formData) {
    parsedFormData = rawParams.formData;
  }
  
  const {branches, addBranch, setUserId} = useStore();
  const branch = isResubmit && branchId ? branches.find(b => b.id === branchId) : null;

  const [form, setForm] = useState<Partial<BranchFormData>>(parsedFormData);
  const [files, setFiles] = useState<{
    branchfrontImage: Asset | null;
    ownerIdProof: Asset | null;
    ownerPhoto: Asset | null;
  }>({
    branchfrontImage: null,
    ownerIdProof: null,
    ownerPhoto: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isResubmit && branch) {
      setFiles({
        branchfrontImage: branch.branchfrontImage
          ? {uri: branch.branchfrontImage}
          : null,
        ownerIdProof: branch.ownerIdProof ? {uri: branch.ownerIdProof} : null,
        ownerPhoto: branch.ownerPhoto ? {uri: branch.ownerPhoto} : null,
      });
    }
  }, [isResubmit, branch]);

  const pickImage = useCallback(async (type: keyof typeof files) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 50 * 1024 * 1024,
      });

      if (!result.didCancel && result.assets && result.assets[0]) {
        setFiles(prev => ({
          ...prev,
          [type]: result.assets?.[0] as Asset,
        }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const handleSubmit = async () => {
    try {
      if (!files.branchfrontImage || !files.ownerIdProof || !files.ownerPhoto) {
        Alert.alert('Error', 'Please upload all required documents');
        return;
      }

      setIsLoading(true);

      // Check if we have all required form data
      if (!form.branchName || !form.branchLocation || !form.branchAddress || 
          !form.openingTime || !form.closingTime || !form.ownerName || 
          !form.govId || !form.phone) {
        Alert.alert('Error', 'Missing required form data');
        setIsLoading(false);
        return;
      }

      // Ensure branchLocation is properly formatted
      let locationCoordinates: [number, number] = [0, 0];
      if (form.branchLocation) {
        if (typeof form.branchLocation === 'string') {
          try {
            const parsedLocation = JSON.parse(form.branchLocation as unknown as string);
            locationCoordinates = [
              parsedLocation.longitude || 0,
              parsedLocation.latitude || 0,
            ];
          } catch (e) {
            console.error('Error parsing location:', e);
          }
        } else {
          locationCoordinates = [
            form.branchLocation.longitude,
            form.branchLocation.latitude,
          ];
        }
      }

      // Ensure address is properly formatted
      const address = {
        street: form.branchAddress?.street || '',
        area: form.branchAddress?.area || '',
        city: form.branchAddress?.city || '',
        pincode: form.branchAddress?.pincode || '',
      };

      const data: RegisterBranchData = {
        name: form.branchName || '',
        location: {
          type: 'Point',
          coordinates: locationCoordinates,
        },
        address: address,
        branchEmail: form.branchEmail || '',
        openingTime: form.openingTime || '',
        closingTime: form.closingTime || '',
        ownerName: form.ownerName || '',
        govId: form.govId || '',
        phone: form.phone || '',
        deliveryServiceAvailable: form.homeDelivery === 'yes',
        selfPickup: form.selfPickup === 'yes',
        branchfrontImage: {
          uri: files.branchfrontImage.uri,
          type: files.branchfrontImage.type || 'image/jpeg',
          name: 'branchfront.jpg',
        },
        ownerIdProof: {
          uri: files.ownerIdProof.uri,
          type: files.ownerIdProof.type || 'image/jpeg',
          name: 'ownerid.jpg',
        },
        ownerPhoto: {
          uri: files.ownerPhoto.uri,
          type: files.ownerPhoto.type || 'image/jpeg',
          name: 'ownerphoto.jpg',
        },
      };

      let response;
      if (isResubmit && branchId) {
        // For resubmit, we'll use the patch method directly
        const formData = new FormData();
        
        formData.append('branchName', data.name);
        formData.append(
          'branchLocation',
          JSON.stringify({
            latitude: data.location.coordinates[1],
            longitude: data.location.coordinates[0],
          }),
        );
        formData.append('branchAddress', JSON.stringify(data.address));
        formData.append('branchEmail', data.branchEmail || '');
        formData.append('openingTime', data.openingTime);
        formData.append('closingTime', data.closingTime);
        formData.append('ownerName', data.ownerName);
        formData.append('govId', data.govId);
        formData.append('phone', data.phone);
        formData.append('homeDelivery', data.deliveryServiceAvailable.toString());
        formData.append('selfPickup', data.selfPickup.toString());
        
        formData.append('branchfrontImage', {
          uri: files.branchfrontImage.uri,
          type: files.branchfrontImage.type || 'image/jpeg',
          name: 'branchfront.jpg',
        } as any);
        
        formData.append('ownerIdProof', {
          uri: files.ownerIdProof.uri,
          type: files.ownerIdProof.type || 'image/jpeg',
          name: 'ownerid.jpg',
        } as any);
        
        formData.append('ownerPhoto', {
          uri: files.ownerPhoto.uri,
          type: files.ownerPhoto.type || 'image/jpeg',
          name: 'ownerphoto.jpg',
        } as any);
        
        response = await api.patch(`/modify/branch/${branchId}`, formData, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
      } else {
        response = await registerBranch(data);
      }

      if (response?.data) {
        const id = response.data.id || response.data._id || response.data.branch?._id;
        const token = response.data.token || response.data.accessToken;
        
        if (token) {
          await AsyncStorage.setItem('token', token);
          await storage.set('token', token);
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
        }
        
        if (id) {
          await AsyncStorage.setItem('userId', id);
          await storage.set('userId', id);
          
          // Create a branch object that satisfies the BranchInternal interface
          const newBranch: BranchInternal = {
            id,
            status: 'pending',
            phone: form.phone || '',
            name: form.branchName || '',
            openingTime: form.openingTime || '',
            closingTime: form.closingTime || '',
            ownerName: form.ownerName || '',
            govId: form.govId || '',
            address: address,
            location: {
              type: 'Point',
              coordinates: locationCoordinates,
            },
            deliveryServiceAvailable: form.homeDelivery === 'yes',
            selfPickup: form.selfPickup === 'yes',
          };
          
          // Type assertion to match the expected Branch type
          addBranch(newBranch as unknown as Branch);
          setUserId(id);
          
          navigation.navigate('StatusScreen', {
            id,
            type: 'branch',
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to submit: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Please upload the following documents to complete your registration:
      </Text>

      <Button
        title={
          files.branchfrontImage ? 'Branch Front Image ✓' : 'Upload Branch Front Image'
        }
        onPress={() => pickImage('branchfrontImage')}
      />

      <Button
        title={
          files.ownerIdProof ? 'Owner ID Proof ✓' : 'Upload Owner ID Proof'
        }
        onPress={() => pickImage('ownerIdProof')}
      />

      <Button
        title={files.ownerPhoto ? 'Owner Photo ✓' : 'Upload Owner Photo'}
        onPress={() => pickImage('ownerPhoto')}
      />

      {!files.branchfrontImage ||
      !files.ownerIdProof ||
      !files.ownerPhoto ? (
        <Text style={styles.warning}>
          All documents are required to proceed.
        </Text>
      ) : null}

      <Button
        title={isLoading ? 'Submitting...' : 'Submit'}
        onPress={handleSubmit}
        disabled={
          isLoading ||
          !files.branchfrontImage ||
          !files.ownerIdProof ||
          !files.ownerPhoto
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, backgroundColor: '#f5f5f5'},
  text: {marginVertical: 10},
  warning: {marginVertical: 10, color: 'red'},
  button: {marginVertical: 10},
});

export default UploadBranchDocs;
