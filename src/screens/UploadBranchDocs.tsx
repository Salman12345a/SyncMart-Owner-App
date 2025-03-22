import React, {useState, useCallback, useEffect} from 'react';
import {View, Button, Text, StyleSheet, Alert} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {registerBranch} from '../services/api';
import api from '../services/api';
import {useStore} from '../store/ordersStore';
import {storage} from '../utils/storage';

const UploadBranchDocs: React.FC = ({route, navigation}) => {
  const {formData, branchId, isResubmit} = route.params || {};
  const {branches, addBranch, setUserId} = useStore();
  const branch = isResubmit ? branches.find(b => b.id === branchId) : null;

  const [form] = useState(formData || {});
  const [files, setFiles] = useState({
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

  const pickFile = useCallback(async (type: string) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
      });
      if (!result.didCancel && result.assets) {
        setFiles(prev => ({...prev, [type]: result.assets[0]}));
      }
    } catch (error) {
      Alert.alert('Error', `Failed to pick ${type}`);
      console.error(`Error picking ${type}:`, error);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!files.branchfrontImage || !files.ownerIdProof || !files.ownerPhoto) {
      Alert.alert('Error', 'Please upload all required files');
      return;
    }

    setIsLoading(true);

    const location = JSON.parse(form.branchLocation);
    const address = JSON.parse(form.branchAddress);

    const data = {
      name: form.name,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      address: {
        street: address.street,
        area: address.area,
        city: address.city,
        pincode: address.pincode,
      },
      branchEmail: form.branchEmail,
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      ownerName: form.ownerName,
      govId: form.govId,
      phone: form.phone,
      deliveryServiceAvailable: form.deliveryServiceAvailable,
      selfPickup: form.selfPickup,
      branchfrontImage: files.branchfrontImage,
      ownerIdProof: files.ownerIdProof,
      ownerPhoto: files.ownerPhoto,
    };

    try {
      let response;
      if (isResubmit) {
        response = await api.patch(`/modify/branch/${branchId}`, {
          name: form.name,
          branchLocation: form.branchLocation,
          branchAddress: form.branchAddress,
          branchEmail: form.branchEmail,
          openingTime: form.openingTime,
          closingTime: form.closingTime,
          ownerName: form.ownerName,
          govId: form.govId,
          phone: form.phone,
          deliveryServiceAvailable: form.deliveryServiceAvailable,
          selfPickup: form.selfPickup,
          branchfrontImage: files.branchfrontImage,
          ownerIdProof: files.ownerIdProof,
          ownerPhoto: files.ownerPhoto,
        });
      } else {
        // Register branch
        response = await registerBranch(data);
        console.log('Register response:', response);

        // Log in to get userId-based token
        const loginResponse = await api.post('/auth/branch/login', {
          phone: data.phone,
        });
        console.log('Login response:', loginResponse.data);

        // Store tokens and userId
        const branchId = response.branch?._id;
        const accessToken = loginResponse.data.accessToken;

        if (!branchId) {
          throw new Error('Registration failed: No branch ID returned');
        }
        if (!accessToken) {
          throw new Error('Login failed: No access token returned');
        }

        await AsyncStorage.setItem('userId', branchId);
        await AsyncStorage.setItem('accessToken', accessToken);
        setUserId(branchId);
        console.log('Stored userId:', branchId, 'accessToken:', accessToken);
      }

      addBranch({
        id: response.branch._id,
        status: response.branch.status,
        name: response.branch.name,
        phone: data.phone,
        address,
        location: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
        },
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
      });

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
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [files, form, isResubmit, branchId, addBranch, setUserId, navigation]);

  return (
    <View style={styles.container}>
      <Button
        title="Pick Branch Front Image"
        onPress={() => pickFile('branchfrontImage')}
        disabled={isLoading}
      />
      <Text style={styles.text}>
        {files.branchfrontImage
          ? files.branchfrontImage.fileName || 'Branch Front Uploaded'
          : 'No Branch Front Uploaded'}
      </Text>
      <Button
        title="Pick Owner ID Proof"
        onPress={() => pickFile('ownerIdProof')}
        disabled={isLoading}
      />
      <Text style={styles.text}>
        {files.ownerIdProof
          ? files.ownerIdProof.fileName || 'Owner ID Proof Uploaded'
          : 'No Owner ID Proof Uploaded'}
      </Text>
      <Button
        title="Pick Owner Photo"
        onPress={() => pickFile('ownerPhoto')}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, backgroundColor: '#f5f5f5'},
  text: {marginVertical: 10},
});

export default UploadBranchDocs;
