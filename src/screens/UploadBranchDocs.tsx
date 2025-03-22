import React, {useState, useCallback, useEffect} from 'react';
import {View, Button, Text, StyleSheet, Alert} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {registerBranch, resubmitBranch} from '../services/api';
import {useStore} from '../store/ordersStore';
import {storage} from '../utils/storage'; // MMKV

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
        response = await resubmitBranch(branchId, {
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
        response = await registerBranch(data);
        console.log('Register response:', response); // Log full response
        setUserId(response.branch._id); // Set userId in store
        // Explicitly store userId and accessToken in AsyncStorage
        await AsyncStorage.setItem('userId', response.branch._id);
        if (response.accessToken) {
          await AsyncStorage.setItem('accessToken', response.accessToken);
          console.log('Stored accessToken:', response.accessToken);
        } else {
          console.warn('No accessToken in response');
        }
      }

      addBranch({
        id: response.branch._id,
        status: response.branch.status,
        name: response.branch.name,
        phone: data.phone,
        address: address,
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
      console.log(
        'Navigating to StatusScreen with branchId:',
        response.branch._id,
      );
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
