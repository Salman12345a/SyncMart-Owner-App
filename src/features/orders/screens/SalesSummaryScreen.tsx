import React, {useEffect, useCallback, useState} from 'react';
import {View, StyleSheet, Text, Alert} from 'react-native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../../../navigation/AppNavigator';
import api from '../../../services/api';
import {storage} from '../../../utils/storage';

type SalesSummaryScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'SalesSummary'
>;

interface SalesSummaryScreenProps {
  navigation: SalesSummaryScreenNavigationProp;
}

interface SalesData {
  branchId: string;
  timeRange: {
    from: string;
    to: string;
  };
  orderCount: number;
  totalSales: number;
  itemSales: Record<string, {quantity: number; revenue: number}>;
  currency: string;
}

const SalesSummaryScreen: React.FC<SalesSummaryScreenProps> = ({
  navigation,
}) => {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    try {
      const branchId = storage.getString('userId');
      if (!branchId) {
        console.error('No branchId available - redirecting to login');
        Alert.alert('Error', 'User not authenticated. Please login again.', [
          {
            text: 'OK',
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{name: 'Authentication'}],
              }),
          },
        ]);
        return;
      }

      console.log('Fetching sales for branchId:', branchId);

      const token = storage.getString('accessToken');
      if (!token) {
        console.error('No token available - redirecting to login');
        Alert.alert('Error', 'User not authenticated. Please login again.', [
          {
            text: 'OK',
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{name: 'Authentication'}],
              }),
          },
        ]);
        return;
      }

      const response = await api.get(`/orders/${branchId}/sales/last24hours`);
      console.log('Sales fetched successfully:', response.data);

      setSalesData(response.data.data);
    } catch (error: any) {
      console.error(
        'Fetch Sales Error:',
        error?.response?.status,
        error?.response?.data || error?.message || error,
      );

      if (error?.response?.status === 401) {
        console.log('Unauthorized - redirecting to login');
        storage.delete('accessToken');
        storage.delete('userId');
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.reset({
                  index: 0,
                  routes: [{name: 'Authentication'}],
                }),
            },
          ],
        );
        return;
      }

      Alert.alert('Error', 'Failed to load sales data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!salesData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load sales data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.details}>
        <Text style={styles.label}>Orders: {salesData.orderCount}</Text>
        <Text style={styles.label}>
          Total Sales: ₹{salesData.totalSales.toLocaleString('en-IN')}
        </Text>

        <Text style={styles.label}>Currency: {salesData.currency}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  details: {
    flex: 1,
  },
  label: {
    fontSize: 20,
    color: '#333',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 20,
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 20,
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SalesSummaryScreen;
