import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import socketService from '../services/socket';
import {useStore} from '../store/ordersStore';

type NavigationProp = StackNavigationProp<
  RootStackParamList,
  'BranchStatusScreen'
>;

const BranchStatusScreen: React.FC = ({route}) => {
  const navigation = useNavigation<NavigationProp>();
  const {id, status: initialStatus} = route.params;
  const {setBranch} = useStore();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [socketError, setSocketError] = useState<string | null>(null);

  useEffect(() => {
    socketService.connectBranchRegistration(id);
    const socket = socketService.getSocket();

    socket?.on('connect', () => setLoading(false));
    socket?.on('connect_error', err => {
      console.error('Socket connection error:', err.message);
      setSocketError('Failed to connect to server. Please try again later.');
      setLoading(false);
    });
    socket?.on('branchStatusUpdate', (data: {id: string; status: string}) => {
      if (data.id === id) {
        setStatus(data.status);
        setBranch({...useStore.getState().branch!, status: data.status});
      }
    });

    return () => {
      socketService.disconnect();
    };
  }, [id, setBranch]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Branch Registration Status</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#2c3e50" />
      ) : socketError ? (
        <>
          <Text style={styles.errorText}>{socketError}</Text>
        </>
      ) : (
        <>
          <Text style={styles.status}>Status: {status}</Text>
          {status === 'approved' && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('HomeScreen')}>
              <Text style={styles.buttonText}>Welcome to SyncMart</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 30,
  },
  status: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2ecc71',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BranchStatusScreen;
