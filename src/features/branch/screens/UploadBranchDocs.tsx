import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
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
  route: UploadBranchDocsRouteProp & {
    params?: {
      formData: any;
      branchId?: string;
      isResubmit?: boolean;
    };
  };
}

interface Asset {
  uri: string;
  type: string;
  name: string;
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
          ? {
              uri: branch.branchfrontImage,
              type: 'image/jpeg',
              name: 'branch-front.jpg',
            }
          : null,
        ownerIdProof: branch.ownerIdProof
          ? {
              uri: branch.ownerIdProof,
              type: 'image/jpeg',
              name: 'owner-id.jpg',
            }
          : null,
        ownerPhoto: branch.ownerPhoto
          ? {
              uri: branch.ownerPhoto,
              type: 'image/jpeg',
              name: 'owner-photo.jpg',
            }
          : null,
      });
    }
  }, [isResubmit, branch]);

  const pickImage = useCallback(async (type: keyof typeof files) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
      });

      if (!result.didCancel && result.assets?.[0]?.uri) {
        const asset = result.assets[0];
        setFiles(prev => ({
          ...prev,
          [type]: {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'image.jpg',
            size: asset.fileSize,
          },
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
        name: String(form.name || ''),
        location: {
          type: 'Point' as const,
          coordinates: [
            Number(location.longitude) || 0,
            Number(location.latitude) || 0,
          ] as [number, number],
        },
        address: {
          street: String(address.street || ''),
          area: String(address.area || ''),
          city: String(address.city || ''),
          pincode: String(address.pincode || ''),
        },
        branchEmail: String(form.branchEmail || ''),
        openingTime: String(form.openingTime || ''),
        closingTime: String(form.closingTime || ''),
        ownerName: String(form.ownerName || ''),
        govId: String(form.govId || ''),
        phone: String(form.phone || ''),
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

        // For resubmission, update branch data immediately
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
        navigation.navigate('StatusScreen', {
          id: response.branch._id,
          type: 'branch',
        });
      } else {
        // For new registration
        response = await registerBranch(data);

        // Send OTP after successful registration
        try {
          const otpResponse = await api.post('/auth/branch/send-otp', {
            phone: data.phone,
          });

          if (otpResponse.data.success) {
            // Store registration data temporarily
            storage.set(
              'pendingBranchData',
              JSON.stringify({
                branchData: response.branch,
                formData: data,
              }),
            );

            navigation.navigate('OTPVerification', {
              phone: data.phone,
              token: otpResponse.data.token,
              branchId: response.branch._id,
            });
          }
        } catch (otpError: any) {
          Alert.alert(
            'Error',
            otpError.response?.data?.message || 'Failed to send OTP',
          );
        }
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        (isResubmit ? 'Resubmission failed' : 'Upload failed');
      Alert.alert('Error', errorMessage);
      console.error(
        isResubmit ? 'Resubmission failed:' : 'Upload failed:',
        error.response?.data || error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [files, form, isResubmit, branchId, branch, addBranch, navigation]);

  // Render preview if image exists
  const renderImagePreview = (type: keyof typeof files) => {
    if (files[type]?.uri) {
      return (
        <View style={styles.previewContainer}>
          <Image source={{uri: files[type]?.uri}} style={styles.imagePreview} />
          <Text style={styles.imageUploaded}>
            {type === 'branchfrontImage'
              ? 'Branch Front'
              : type === 'ownerIdProof'
              ? 'ID Proof'
              : 'Owner Photo'}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Upload Branch Documents</Text>
      <Text style={styles.subheader}>
        Please upload the required documents for branch registration
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Branch Front Image *</Text>
        <View style={styles.uploadSection}>
          {renderImagePreview('branchfrontImage')}
          <TouchableOpacity
            style={[
              styles.uploadIconContainer,
              isLoading && styles.buttonDisabled,
              files.branchfrontImage && styles.uploadCompleted,
            ]}
            onPress={() => pickImage('branchfrontImage')}
            disabled={isLoading}>
            <Icon
              name={files.branchfrontImage ? 'check-circle' : 'add-a-photo'}
              size={32}
              color={files.branchfrontImage ? '#2ecc71' : '#3498db'}
            />
            <Text style={styles.uploadText}>
              {files.branchfrontImage ? 'Change Image' : 'Tap to Upload'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Owner ID Proof *</Text>
        <View style={styles.uploadSection}>
          {renderImagePreview('ownerIdProof')}
          <TouchableOpacity
            style={[
              styles.uploadIconContainer,
              isLoading && styles.buttonDisabled,
              files.ownerIdProof && styles.uploadCompleted,
            ]}
            onPress={() => pickImage('ownerIdProof')}
            disabled={isLoading}>
            <Icon
              name={files.ownerIdProof ? 'check-circle' : 'badge'}
              size={32}
              color={files.ownerIdProof ? '#2ecc71' : '#3498db'}
            />
            <Text style={styles.uploadText}>
              {files.ownerIdProof ? 'Change Image' : 'Tap to Upload'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Owner Photo *</Text>
        <View style={styles.uploadSection}>
          {renderImagePreview('ownerPhoto')}
          <TouchableOpacity
            style={[
              styles.uploadIconContainer,
              isLoading && styles.buttonDisabled,
              files.ownerPhoto && styles.uploadCompleted,
            ]}
            onPress={() => pickImage('ownerPhoto')}
            disabled={isLoading}>
            <Icon
              name={files.ownerPhoto ? 'check-circle' : 'person-add'}
              size={32}
              color={files.ownerPhoto ? '#2ecc71' : '#3498db'}
            />
            <Text style={styles.uploadText}>
              {files.ownerPhoto ? 'Change Image' : 'Tap to Upload'}
            </Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 12,
    fontWeight: '500',
  },
  uploadSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadIconContainer: {
    flex: 1,
    height: 120,
    backgroundColor: '#ecf0f1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#dcdde1',
    borderStyle: 'dashed',
  },
  uploadCompleted: {
    borderColor: '#2ecc71',
    borderStyle: 'solid',
    backgroundColor: '#eafaf1',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  previewContainer: {
    width: '45%',
    marginRight: 10,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  imageUploaded: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 12,
    color: '#2c3e50',
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
    opacity: 0.7,
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
