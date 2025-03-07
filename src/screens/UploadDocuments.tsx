import React, {useState} from 'react';
import {View, Button, Text} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {registerDeliveryPartner} from '../services/api';
import {useStore} from '../store/ordersStore';

const UploadDocuments: React.FC = ({route, navigation}) => {
  const {formData} = route.params;
  const [files, setFiles] = useState({
    licenseImage: null,
    rcImage: null,
    pancard: null,
  });
  const {addDeliveryPartner} = useStore();

  const pickFile = async (type: string) => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: 50 * 1024 * 1024,
    }); // Max 50MB
    if (!result.didCancel && result.assets) {
      setFiles({...files, [type]: result.assets[0]});
    }
  };

  const handleSubmit = async () => {
    if (!files.licenseImage || !files.rcImage || !files.pancard) {
      console.error('All files must be uploaded');
      return;
    }

    const data = {
      ...formData,
      licenseImage: {
        uri: files.licenseImage.uri,
        type: 'image/jpeg',
        name: 'license.jpg',
      },
      rcImage: {
        uri: files.rcImage.uri,
        type: 'image/jpeg',
        name: 'rc.jpg',
      },
      pancard: {
        uri: files.pancard.uri,
        type: 'image/jpeg',
        name: 'pancard.jpg',
      },
    };

    try {
      const response = await registerDeliveryPartner(data);
      addDeliveryPartner({id: response.id, status: 'pending'});
      navigation.navigate('SuccessScreen', {partnerId: response.id});
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <View style={{padding: 20}}>
      <Button
        title="Pick License Image"
        onPress={() => pickFile('licenseImage')}
      />
      <Text>
        {files.licenseImage ? 'License Uploaded' : 'No License Uploaded'}
      </Text>
      <Button title="Pick RC Image" onPress={() => pickFile('rcImage')} />
      <Text>{files.rcImage ? 'RC Uploaded' : 'No RC Uploaded'}</Text>
      <Button title="Pick Pancard" onPress={() => pickFile('pancard')} />
      <Text>{files.pancard ? 'Pancard Uploaded' : 'No Pancard Uploaded'}</Text>
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
};

export default UploadDocuments;
