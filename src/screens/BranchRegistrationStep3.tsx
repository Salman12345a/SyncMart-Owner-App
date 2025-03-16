import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useStore} from '../store/ordersStore';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'BranchRegistrationStep3'
>;

const BranchRegistrationStep3: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {setRegistrationFormStep} = useStore();
  const [files, setFiles] = useState({
    branchfrontImage: null,
    ownerIdProof: null,
    ownerPhoto: null,
  });
  const [loading, setLoading] = useState({
    branchfrontImage: false,
    ownerIdProof: false,
    ownerPhoto: false,
  });

  const pickFile = async (type: string) => {
    setLoading(prev => ({...prev, [type]: true}));
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 1024,
        maxHeight: 1024,
      });
      if (!result.didCancel && result.assets) {
        const asset = result.assets[0];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(asset.type)) {
          alert('Please select a JPEG, PNG, or WebP image');
          return;
        }
        if (asset.fileSize > 5 * 1024 * 1024) {
          // 5MB limit
          alert('Image size must be less than 5MB');
          return;
        }
        setFiles({...files, [type]: asset});
      }
    } catch (error) {
      console.error(`Error picking ${type}:`, error);
      alert('Failed to pick image. Please try again.');
    } finally {
      setLoading(prev => ({...prev, [type]: false}));
    }
  };

  const handleNext = () => {
    if (!files.branchfrontImage || !files.ownerIdProof || !files.ownerPhoto) {
      alert('Please upload all required images');
      return;
    }
    setRegistrationFormStep('step3Data', files);
    navigation.navigate('BranchRegistrationStep4');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upload Documents (Step 3/4)</Text>
      {(['branchfrontImage', 'ownerIdProof', 'ownerPhoto'] as const).map(
        type => (
          <View style={styles.uploadSection} key={type}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickFile(type)}
              disabled={loading[type]}>
              {loading[type] ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>
                  Upload{' '}
                  {type === 'branchfrontImage'
                    ? 'Branch Front Image'
                    : type === 'ownerIdProof'
                    ? 'Owner ID Proof'
                    : 'Owner Photo'}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={files[type] ? styles.successText : styles.errorText}>
              {files[type] ? '✓ Uploaded' : 'Required'}
            </Text>
          </View>
        ),
      )}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.buttonText}>Next</Text>
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
  nextButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
});

export default BranchRegistrationStep3;
