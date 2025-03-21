import React, {useState, useCallback, useEffect} from 'react';
import {View, Button, Text, StyleSheet, Alert} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {registerBranch, modifyBranch} from '../services/api';
import {useStore} from '../store/ordersStore';

const UploadBranchDocs: React.FC = ({route, navigation}) => {
  const {formData, branchId, isReRegister} = route.params || {};
  const {branches, addBranch, setUserId} = useStore();
  const branch = isReRegister ? branches.find(b => b.id === branchId) : null;

  const [form] = useState(formData || {});
  const [files, setFiles] = useState({
    branchfrontImage: null,
    ownerIdProof: null,
    ownerPhoto: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isReRegister && branch) {
      setFiles({
        branchfrontImage: branch.branchfrontImage
          ? {uri: branch.branchfrontImage}
          : null,
        ownerIdProof: branch.ownerIdProof ? {uri: branch.ownerIdProof} : null,
        ownerPhoto: branch.ownerPhoto ? {uri: branch.ownerPhoto} : null,
      });
    }
  }, [isReRegister, branch]);

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

    console.log('form:', form);
    console.log('form.branchLocation:', form.branchLocation);

    let latitude, longitude;
    try {
      if (!form.branchLocation || typeof form.branchLocation !== 'string') {
        throw new Error('Branch location is missing or not a string');
      }

      const location = JSON.parse(form.branchLocation);
      console.log('Parsed location:', location);

      if (
        !location ||
        !location.type ||
        location.type !== 'Point' ||
        !Array.isArray(location.coordinates) ||
        location.coordinates.length !== 2
      ) {
        throw new Error(
          'Invalid branchLocation format: expected { type: "Point", coordinates: [longitude, latitude] }',
        );
      }

      longitude = location.coordinates[0];
      latitude = location.coordinates[1];

      if (isNaN(longitude) || isNaN(latitude)) {
        throw new Error('Coordinates must be valid numbers');
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', error.message || 'Failed to parse branch location');
      console.error('Branch location parsing error:', error);
      return;
    }

    const data = {
      name: form.name,
      location: {type: 'Point', coordinates: [longitude, latitude]}, // Pass as object
      address: JSON.parse(form.branchAddress),
      branchEmail: form.branchEmail,
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      ownerName: form.ownerName,
      govId: form.govId,
      phone: form.phone,
      deliveryServiceAvailable: form.deliveryServiceAvailable,
      selfPickup: form.selfPickup,
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

    console.log('Data sent:', JSON.stringify(data, null, 2));

    try {
      let response;
      if (isReRegister) {
        response = await modifyBranch(branchId, data); // Pass object directly
      } else {
        response = await registerBranch(data);
        setUserId(response.branch._id);
        await AsyncStorage.setItem('branchId', response.branch._id);
      }

      addBranch({
        id: response.branch._id,
        status: response.branch.status,
        name: response.branch.name,
        phone: form.phone,
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

      await AsyncStorage.setItem('branchStatus', response.branch.status);
      navigation.navigate('StatusScreen', {branchId: response.branch._id});
    } catch (error) {
      const errorMessage =
        error.message ||
        (isReRegister ? 'Re-registration failed' : 'Upload failed');
      Alert.alert('Error', errorMessage);
      console.error(
        isReRegister ? 'Re-registration failed:' : 'Upload failed:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }, [files, form, isReRegister, branchId, addBranch, setUserId, navigation]);

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
      {isLoading && (
        <Text style={styles.text}>
          {isReRegister ? 'Re-registering...' : 'Uploading...'}
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
