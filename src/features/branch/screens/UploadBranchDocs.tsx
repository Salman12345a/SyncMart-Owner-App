import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
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

interface Asset {
  uri: string;
  type?: string;
  fileName?: string;
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
  branchEmail?: string;
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
        quality: 0.7,
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

        if (response.branch.status === 'approved') {
          storage.set('isApproved', true);
        } else {
          storage.set('isApproved', false);
        }
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Upload Branch Documents</Text>
      <Text style={styles.subheader}>
        Please upload the required documents for branch registration
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch Front Image *</Text>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            isLoading && styles.buttonDisabled,
            files.branchfrontImage && styles.uploadButtonSelected,
          ]}
          onPress={() => pickImage('branchfrontImage')}
          disabled={isLoading}>
          <Icon
            name="storefront"
            size={20}
            color={files.branchfrontImage ? '#2ecc71' : '#7f8c8d'}
            style={styles.icon}
          />
          <Text
            style={[
              styles.uploadButtonText,
              files.branchfrontImage && styles.uploadButtonTextSelected,
            ]}>
            {files.branchfrontImage
              ? files.branchfrontImage.fileName || 'Branch Front Uploaded'
              : 'Pick Branch Front Image'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Owner ID Proof *</Text>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            isLoading && styles.buttonDisabled,
            files.ownerIdProof && styles.uploadButtonSelected,
          ]}
          onPress={() => pickImage('ownerIdProof')}
          disabled={isLoading}>
          <Icon
            name="badge"
            size={20}
            color={files.ownerIdProof ? '#2ecc71' : '#7f8c8d'}
            style={styles.icon}
          />
          <Text
            style={[
              styles.uploadButtonText,
              files.ownerIdProof && styles.uploadButtonTextSelected,
            ]}>
            {files.ownerIdProof
              ? files.ownerIdProof.fileName || 'Owner ID Proof Uploaded'
              : 'Pick Owner ID Proof'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Owner Photo *</Text>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            isLoading && styles.buttonDisabled,
            files.ownerPhoto && styles.uploadButtonSelected,
          ]}
          onPress={() => pickImage('ownerPhoto')}
          disabled={isLoading}>
          <Icon
            name="person"
            size={20}
            color={files.ownerPhoto ? '#2ecc71' : '#7f8c8d'}
            style={styles.icon}
          />
          <Text
            style={[
              styles.uploadButtonText,
              files.ownerPhoto && styles.uploadButtonTextSelected,
            ]}>
            {files.ownerPhoto
              ? files.ownerPhoto.fileName || 'Owner Photo Uploaded'
              : 'Pick Owner Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {isResubmit && (
        <Text style={styles.warning}>
          Note: File updates are not supported in resubmission yet. Only text
          fields will be updated.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>
              {isResubmit ? 'Resubmit' : 'Submit'}
            </Text>
            <Icon name="arrow-forward" size={20} color="white" />
          </>
        )}
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ecf0f1',
  },
  uploadButtonSelected: {
    borderColor: '#2ecc71',
  },
  uploadButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#7f8c8d',
  },
  uploadButtonTextSelected: {
    color: '#2ecc71',
  },
  icon: {
    marginRight: 10,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#2ecc71',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  warning: {
    fontSize: 12,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default UploadBranchDocs;
