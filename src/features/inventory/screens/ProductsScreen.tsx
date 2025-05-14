import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Tab, TabView } from '@rneui/themed';
import useInventoryStore from '../../../store/inventoryStore';
import { Product } from '../../../services/inventoryService';
import CustomHeader from '../../../components/ui/CustomHeader';
import CustomButton from '../../../components/ui/CustomButton';
import { useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/types';
import { storage } from '../../../utils/storage';
import { ToastAndroid } from 'react-native';

type ProductsScreenProps = StackScreenProps<RootStackParamList, 'ProductsScreen'>;

const ProductsScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<ProductsScreenProps['route']>();
  const {
    products,
    fetchDefaultProducts,
    fetchCustomProducts,
    fetchBranchCategoryProducts,
    toggleProductSelection,
    setActiveProductTab,
    clearProductSelections
  } = useInventoryStore();

  const [productIndex, setProductIndex] = React.useState(0);
  
  // Get branchId from MMKV storage (userId)
  const branchId = storage.getString('userId');
  
  // Get params from route
  const { categoryId, categoryName, isDefault, refresh, refreshTimestamp, defaultCategoryId } = route.params;

  // Effect to handle initial load and refreshes
  useEffect(() => {
    if (categoryId && branchId) {
      // Initial tab selection based on isDefault parameter
      if (isDefault) {
        setActiveProductTab('default');
      } else {
        setActiveProductTab('custom');
      }
      
      // Fetch both default and custom products for this category
      fetchBranchCategoryProducts(branchId, categoryId);
      fetchCustomProducts(branchId, categoryId);
    }
  }, [categoryId, isDefault, branchId, fetchBranchCategoryProducts, fetchCustomProducts, setActiveProductTab, refreshTimestamp]);

  // Clear selections when component mounts or category changes
  useEffect(() => {
    clearProductSelections(categoryId);
  }, [categoryId, clearProductSelections]);

  const handleProductSelect = (productId: string) => {
    toggleProductSelection(productId, categoryId);
  };

  const navigateToSelectDefaultProducts = () => {
    navigation.navigate('SelectDefaultProducts', {
      categoryId, // branch category id
      categoryName,
      defaultCategoryId // pass original default id
    });
  };
  
  const navigateToCreateProduct = () => {
    navigation.navigate('CustomProducts', {
      categoryId,
      categoryName,
      isCustom: true
    });
  };

  const renderProductItem = (product: Product) => {
    const isSelected = products[products.activeTab].selected[categoryId]?.includes(product._id) || false;
    
    return (
      <TouchableOpacity
        key={product._id}
        style={[styles.itemContainer, isSelected && styles.selectedItem]}
        onPress={() => handleProductSelect(product._id)}
      >
        <Text style={styles.itemName}>{product.name}</Text>
        <Text style={styles.itemPrice}>₹{product.price}</Text>
        <Text style={styles.itemDescription}>{product.description || 'No description'}</Text>
        {/* Show an indicator for custom products */}
        {!product.createdFromTemplate && (
          <View style={styles.customProductIndicator}>
            <Text style={styles.customProductText}>Custom</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const activeProducts = products[products.activeTab];
  const allCategoryProducts = activeProducts.items[categoryId] || [];
  
  // Filter products based on the active tab and createdFromTemplate flag
  const selectedCategoryProducts = products.activeTab === 'default'
    ? allCategoryProducts.filter(product => product.createdFromTemplate)
    : allCategoryProducts.filter(product => !product.createdFromTemplate);

  return (
    <View style={styles.mainContainer}>
      <CustomHeader title={`${categoryName} Products`} />
      
      <View style={styles.container}>
        <Tab
          value={productIndex}
          onChange={(index) => {
            setProductIndex(index);
            setActiveProductTab(index === 0 ? 'default' : 'custom');
          }}
          indicatorStyle={styles.tabIndicator}
        >
          <Tab.Item
            title="Default"
            titleStyle={styles.tabTitle}
          />
          <Tab.Item
            title="Custom"
            titleStyle={styles.tabTitle}
          />
        </Tab>

        <TabView value={productIndex} onChange={setProductIndex} animationType="spring">
          {/* Default Products Tab */}
          <TabView.Item style={styles.tabContent}>
            <ScrollView style={styles.scrollView}>
              {products.default.loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading default products...</Text>
                </View>
              ) : products.default.error ? (
                <Text style={styles.errorText}>{products.default.error}</Text>
              ) : (
                <>
                  {selectedCategoryProducts.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No products imported for this category yet</Text>
                      <View style={styles.buttonContainer}>
                        <CustomButton
                          title="Import New Products"
                          onPress={navigateToSelectDefaultProducts}
                        />
                      </View>
                    </View>
                  ) : (
                    <>
                      {selectedCategoryProducts.map(renderProductItem)}
                      <View style={styles.buttonContainer}>
                        <CustomButton
                          title="Import New Products"
                          onPress={navigateToSelectDefaultProducts}
                        />
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </TabView.Item>
          
          {/* Custom Products Tab */}
          <TabView.Item style={styles.tabContent}>
            <ScrollView style={styles.scrollView}>
              {products.custom.loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading custom products...</Text>
                </View>
              ) : products.custom.error ? (
                <Text style={styles.errorText}>{products.custom.error}</Text>
              ) : (
                <>
                  {selectedCategoryProducts.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No custom products added yet</Text>
                      <View style={styles.buttonContainer}>
                        <CustomButton
                          title="Create New Product"
                          onPress={navigateToCreateProduct}
                        />
                      </View>
                    </View>
                  ) : (
                    <>
                      {selectedCategoryProducts.map(renderProductItem)}
                      <View style={styles.buttonContainer}>
                        <CustomButton
                          title="Create New Product"
                          onPress={navigateToCreateProduct}
                        />
                      </View>
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </TabView.Item>
        </TabView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 10,
  },
  tabIndicator: {
    backgroundColor: '#007AFF',
    height: 3,
  },
  tabTitle: {
    color: '#007AFF',
    fontSize: 14,
  },
  tabContent: {
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  itemContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  selectedItem: {
    backgroundColor: '#e6f7ff',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  itemPrice: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 12,
    color: '#6c757d',
  },
  customProductIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  customProductText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  importButtonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#6c757d',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#dc3545',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 15,
    marginBottom: 20,
    width: '100%',
  },
});

export default ProductsScreen;
