import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import Header from '../components/Header';
import FinancialSummary from '../components/FinancialSummary';
import {useStore} from '../store/store';
import api from '../services/api';

export default function FinancialSummaryScreen() {
  const {setFinancials, financials} = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancials = async () => {
      try {
        const response = await api.get('/transactions/summary');
        setFinancials(response.data);
      } catch (err) {
        console.error('Fetch Financials Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinancials();
  }, [setFinancials]);

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Header title="Financial Summary" />
      <FinancialSummary financials={financials} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
});
