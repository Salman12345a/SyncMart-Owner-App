import React, {useState, useCallback} from 'react';
import {View, Button, Text, StyleSheet, Alert} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {registerBranch} from '../services/api';
import {useStore} from '../store/ordersStore';

const UploadBranchDocs: React.FC = ({route, navigation}) => {
  const {formData} = route.params;
  const [files, setFiles] = useState({
    branchfrontImage: null,
    ownerIdProof: null,
    ownerPhoto: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const {addBranch, setUserId} = useStore(); // Added setUserId

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

    const data = {
      name: formData.name,
      location: JSON.parse(formData.branchLocation),
      address: JSON.parse(formData.branchAddress),
      branchEmail: formData.branchEmail,
      openingTime: formData.openingTime,
      closingTime: formData.closingTime,
      ownerName: formData.ownerName,
      govId: formData.govId,
      phone: formData.phone,
      deliveryServiceAvailable: formData.deliveryServiceAvailable,
      selfPickup: formData.selfPickup,
      branchfrontImage: {
        uri: files.branchfrontImage.uri,
        type: files.branchfrontImage.type || 'image/jpeg',
        name: files.branchfrontImage.fileName || 'branchfrontImage.jpg',
      },
      ownerIdProof: {
        uri: files.ownerIdProof.uri,
        type: files.ownerIdProof.type || 'image/jpeg',
        name: files.ownerIdProof.fileName || 'ownerIdProof.jpg',
      },
      ownerPhoto: {
        uri: files.ownerPhoto.uri,
        type: files.ownerPhoto.type || 'image/jpeg',
        name: files.ownerPhoto.fileName || 'ownerPhoto.jpg',
      },
    };

    console.log('Data sent to registerBranch:', JSON.stringify(data, null, 2));

    try {
      const response = await registerBranch(data);
      // Populate the store with the full branch object
      addBranch({
        id: response.branch._id,
        status: response.branch.status,
        name: response.branch.name,
        phone: response.branch.phone,
        address: response.branch.address,
        location: response.branch.location,
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

      // Set userId to branchId
      setUserId(response.branch._id);
      console.log('UserId set to:', response.branch._id);

      await AsyncStorage.setItem('branchId', response.branch._id);
      await AsyncStorage.setItem('branchStatus', response.branch.status);
      navigation.navigate('StatusScreen', {branchId: response.branch._id});
    } catch (error) {
      Alert.alert('Error', error.error || 'Upload failed');
      console.error('Upload failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [files, formData, addBranch, setUserId, navigation]);

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
      <Button title="Submit" onPress={handleSubmit} disabled={isLoading} />
      {isLoading && <Text style={styles.text}>Uploading...</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {padding: 20, backgroundColor: '#f5f5f5'},
  text: {marginVertical: 10},
});

export default UploadBranchDocs;
