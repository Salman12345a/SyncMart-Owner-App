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

// Type definitions remain the same until UploadBranchDocsProps
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

interface Asset {
  uri: string;
  type?: string;
  fileName?: string; // Changed from name to fileName to match first code
  size?: number;
}

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
  branchEmail?: string; // Added from first code
}

interface UploadBranchDocsRouteParams {
  formData: any; // Made more flexible to handle both string and object
  branchId?: string;
  isResubmit?: boolean;
}

interface BranchFormData {
  name: string; // Updated to match first code's field names
  branchLocation: string;
  branchAddress: string;
  branchEmail?: string;
  openingTime: string;
  closingTime: string;
  ownerName: string;
  govId: string;
  phone: string;
  deliveryServiceAvailable: 'yes' | 'no';
  selfPickup: 'yes' | 'no';
}

const UploadBranchDocs: React.FC<UploadBranchDocsProps> = ({
  route,
  navigation,
}) => {
  const {formData, branchId, isResubmit} = route.params || {};
  const {branches, addBranch, setUserId} = useStore();
  const branch =
    isResubmit && branchId ? branches.find(b => b.id === branchId) : null;

  const [form] = useState(() => {
    try {
      return typeof formData === 'string'
        ? JSON.parse(formData)
        : formData || {};
    } catch (e) {
      console.error('Error parsing formData:', e);
      return {};
    }
  });

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
        quality: 0.7, // Added from first code
      });

      if (!result.didCancel && result.assets?.[0]) {
        setFiles(prev => ({
          ...prev,
          [type]: result.assets[0],
        }));
      }
    } catch (error) {
      Alert.alert('Error', `Failed to pick ${type}`);
      console.error(`Error picking ${type}:`, error);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!files.branchfrontImage || !files.ownerIdProof || !files.ownerPhoto) {
      Alert.alert('Error', 'Please upload all required documents');
      return;
    }

    setIsLoading(true);

    try {
      const location = JSON.parse(form.branchLocation || '{}');
      const address = JSON.parse(form.branchAddress || '{}');

      const data = {
        name: form.name || '',
        location: {
          type: 'Point',
          coordinates: [location.longitude || 0, location.latitude || 0],
        },
        address: {
          street: address.street || '',
          area: address.area || '',
          city: address.city || '',
          pincode: address.pincode || '',
        },
        branchEmail: form.branchEmail || '',
        openingTime: form.openingTime || '',
        closingTime: form.closingTime || '',
        ownerName: form.ownerName || '',
        govId: form.govId || '',
        phone: form.phone || '',
        deliveryServiceAvailable: form.deliveryServiceAvailable === 'yes',
        selfPickup: form.selfPickup === 'yes',
        branchfrontImage: files.branchfrontImage,
        ownerIdProof: files.ownerIdProof,
        ownerPhoto: files.ownerPhoto,
      };

      let response;
      if (isResubmit && branchId) {
        const payload = {
          branchName: data.name,
          location: data.location,
          address: data.address,
          branchEmail: data.branchEmail,
          openingTime: data.openingTime,
          closingTime: data.closingTime,
          ownerName: data.ownerName,
          govId: data.govId,
          phone: data.phone,
          homeDelivery: data.deliveryServiceAvailable,
          selfPickup: data.selfPickup,
          branchfrontImage: branch?.branchfrontImage || '',
          ownerIdProof: branch?.ownerIdProof || '',
          ownerPhoto: branch?.ownerPhoto || '',
        };

        response = await api.patch(`/modify/branch/${branchId}`, payload);
        response = response.data;
      } else {
        response = await registerBranch(data);

        const loginResponse = await api.post('/auth/branch/login', {
          phone: data.phone,
        });

        const newBranchId = response.branch?._id;
        const accessToken = loginResponse.data.accessToken;

        if (newBranchId && accessToken) {
          await AsyncStorage.setItem('userId', newBranchId);
          await AsyncStorage.setItem('accessToken', accessToken);
          setUserId(newBranchId);
        }
      }

      const branchData: Branch = {
        id: response.branch._id,
        status: response.branch.status || 'pending',
        name: response.branch.name,
        phone: data.phone,
        address: data.address,
        location: data.location,
        branchEmail: response.branch.branchEmail,
        openingTime: response.branch.openingTime,
        closingTime: response.branch.closingTime,
        ownerName: response.branch.ownerName,
        govId: response.branch.govId,
        deliveryServiceAvailable: response.branch.deliveryServiceAvailable,
        selfPickup: response.branch.selfPickup,
        branchfrontImage: response.branch.branchfrontImage,
        ownerIdProof: response.branch.ownerIdProof,
        ownerPhoto: response.branch.ownerPhoto,
      };

      addBranch(branchData);

      if (!isResubmit) {
        storage.set('isRegistered', true);
        storage.set('branchId', response.branch._id);
      }

      navigation.navigate('StatusScreen', {branchId: response.branch._id});
    } catch (error) {
      const errorMessage =
        error.message || (isResubmit ? 'Resubmission failed' : 'Upload failed');
      Alert.alert('Error', errorMessage);
      console.error(
        isResubmit ? 'Resubmission failed:' : 'Upload failed:',
        error.response?.data || error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    files,
    form,
    isResubmit,
    branchId,
    branch,
    addBranch,
    setUserId,
    navigation,
  ]);

  return (
    <View style={styles.container}>
      <Button
        title="Pick Branch Front Image"
        onPress={() => pickImage('branchfrontImage')}
        disabled={isLoading}
      />
      <Text style={styles.text}>
        {files.branchfrontImage
          ? files.branchfrontImage.fileName || 'Branch Front Uploaded'
          : 'No Branch Front Uploaded'}
      </Text>

      <Button
        title="Pick Owner ID Proof"
        onPress={() => pickImage('ownerIdProof')}
        disabled={isLoading}
      />
      <Text style={styles.text}>
        {files.ownerIdProof
          ? files.ownerIdProof.fileName || 'Owner ID Proof Uploaded'
          : 'No Owner ID Proof Uploaded'}
      </Text>

      <Button
        title="Pick Owner Photo"
        onPress={() => pickImage('ownerPhoto')}
        disabled={isLoading}
      />
      <Text style={styles.text}>
        {files.ownerPhoto
          ? files.ownerPhoto.fileName || 'Owner Photo Uploaded'
          : 'No Owner Photo Uploaded'}
      </Text>

      <Button
        title={isResubmit ? 'Resubmit' : 'Submit'}
        onPress={handleSubmit}
        disabled={isLoading}
      />

      {isLoading && (
        <Text style={styles.text}>
          {isResubmit ? 'Resubmitting...' : 'Uploading...'}
        </Text>
      )}

      {isResubmit && (
        <Text style={styles.warning}>
          Note: File updates are not supported in resubmission yet. Only text
          fields will be updated.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, backgroundColor: '#f5f5f5'},
  text: {marginVertical: 10},
  warning: {marginVertical: 10, color: 'red'},
});

export default UploadBranchDocs;
