import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {registerDeliveryPartner} from '../services/api';
import {useStore} from '../store/ordersStore';

const UploadPartnerPhoto: React.FC = ({route, navigation}) => {
  const {formData, initialFiles} = route.params;
  const [deliveryPartnerPhoto, setDeliveryPartnerPhoto] = useState(null);
  const {addDeliveryPartner} = useStore();

  const pickFile = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      maxWidth: 50 * 1024 * 1024,
    });
    if (!result.didCancel && result.assets) {
      setDeliveryPartnerPhoto(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!deliveryPartnerPhoto) {
      console.error('Delivery partner photo must be uploaded');
      return;
    }

    const data = {
      ...formData,
      licenseImage: {
        uri: initialFiles.licenseImage.uri,
        type: initialFiles.licenseImage.type || 'image/jpeg',
        name: 'license.jpg',
      },
      rcImage: {
        uri: initialFiles.rcImage.uri,
        type: initialFiles.rcImage.type || 'image/jpeg',
        name: 'rc.jpg',
      },
      aadhaarFront: {
        uri: initialFiles.aadhaarFront.uri,
        type: initialFiles.aadhaarFront.type || 'image/jpeg',
        name: 'aadhaar_front.jpg',
      },
      aadhaarBack: {
        uri: initialFiles.aadhaarBack.uri,
        type: initialFiles.aadhaarBack.type || 'image/jpeg',
        name: 'aadhaar_back.jpg',
      },
      deliveryPartnerPhoto: {
        uri: deliveryPartnerPhoto.uri,
        type: deliveryPartnerPhoto.type || 'image/jpeg',
        name: 'photo.jpg',
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload Delivery Partner Photo</Text>

      <View style={styles.uploadSection}>
        <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
          <Text style={styles.buttonText}>Upload Partner Photo</Text>
        </TouchableOpacity>
        <Text
          style={deliveryPartnerPhoto ? styles.successText : styles.errorText}>
          {deliveryPartnerPhoto ? '✓ Photo Uploaded' : 'Photo Required'}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          !deliveryPartnerPhoto ? styles.disabledButton : null,
        ]}
        onPress={handleSubmit}
        disabled={!deliveryPartnerPhoto}>
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 25,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
    textAlign: 'center',
  },
  uploadSection: {
    marginBottom: 25,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButton: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  successText: {
    color: '#27ae60',
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default UploadPartnerPhoto;
