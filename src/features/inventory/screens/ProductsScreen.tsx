import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image, Dimensions } from 'react-native';
import { Tab, TabView } from '@rneui/themed';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
      
      console.log('Fetching products for category:', categoryId);
      
      // Fetch both types of products for this category
      const fetchAllProducts = async () => {
        try {
          // First fetch default products (from template)
          await fetchBranchCategoryProducts(branchId, categoryId);
          console.log('Default products fetched successfully');
          
          // Then fetch custom products (created by branch)
          await fetchCustomProducts(branchId, categoryId);
          console.log('Custom products fetched successfully');
        } catch (err) {
          console.error('Error fetching products:', err);
        }
      };
      
      fetchAllProducts();
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

  const navigateToEditProduct = (productId: string) => {
    navigation.navigate('EditProductDetails', {
      productId,
      categoryId,
      categoryName
    });
  };

  // Product card component for grid layout
  const renderProductItem = ({ item: product }: { item: Product }) => {
    const isSelected = products[products.activeTab].selected[categoryId]?.includes(product._id) || false;
    
    return (
      <TouchableOpacity
        style={[styles.gridItem, isSelected && styles.selectedItem]}
        onPress={() => handleProductSelect(product._id)}
      >
        <View style={styles.imageContainer}>
          {product.imageUrl ? (
            <Image 
              source={{ uri: product.imageUrl }} 
              style={styles.productImage} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.itemName} numberOfLines={1}>{product.name}</Text>
            {product.isPacket === false ? (
              <View style={styles.inlineLooseTag}>
                <Text style={styles.looseProductText}>Loose</Text>
              </View>
            ) : product.isPacket === true ? (
              <View style={styles.inlinePackTag}>
                <Text style={styles.packProductText}>Pack</Text>
              </View>
            ) : null}
          </View>
          {product.unit ? (
            <Text style={styles.itemPrice}>₹{product.price}/{product.unit}</Text>
          ) : (
            <Text style={styles.itemPrice}>₹{product.price}</Text>
          )}
          <Text style={styles.itemDescription} numberOfLines={2}>{product.description || 'No description'}</Text>
        </View>
        
        {/* Show edit icon for all products (both default and custom) */}
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => navigateToEditProduct(product._id)}
        >
          <Icon name="edit" size={16} color="#ffffff" />
        </TouchableOpacity>
        
        {/* Custom product indicator (hidden but kept as flag) */}
        {!product.createdFromTemplate && (
          <View style={[styles.customProductIndicator, { display: 'none' }]}>
            <Text style={styles.customProductText}>Custom</Text>
          </View>
        )}
        

        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Get products based on the active tab and filter by createdFromTemplate flag
  const getProductsForTab = () => {
    // For default tab, use only the default store
    // For custom tab, use only the custom store
    // This ensures proper separation of products
    
    if (products.activeTab === 'default') {
      // Default tab: Get products only from default store
      const defaultProducts = products.default.items[categoryId] || [];
      console.log(`Default store has ${defaultProducts.length} products`);
      
      // Filter to ensure only products with createdFromTemplate = true are shown
      const filteredProducts = defaultProducts.filter(product => {
        return product.createdFromTemplate === true;
      });
      
      console.log(`Filtered ${filteredProducts.length} products for DEFAULT tab`);
      return filteredProducts;
    } else {
      // Custom tab: Get products only from custom store
      const customProducts = products.custom.items[categoryId] || [];
      console.log(`Custom store has ${customProducts.length} products`);
      
      // Filter to ensure only products with createdFromTemplate = false are shown
      const filteredProducts = customProducts.filter(product => {
        return product.createdFromTemplate === false;
      });
      
      console.log(`Filtered ${filteredProducts.length} products for CUSTOM tab`);
      return filteredProducts;
    }
  };
  
  const selectedCategoryProducts = getProductsForTab();
  
  console.log(`Final products for ${products.activeTab} tab:`, selectedCategoryProducts.length);

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
            <View style={styles.tabContentContainer}>
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
                      <FlatList
                        data={selectedCategoryProducts}
                        renderItem={renderProductItem}
                        keyExtractor={(item) => item._id}
                        numColumns={2}
                        columnWrapperStyle={styles.gridRow}
                        contentContainerStyle={styles.gridContainer}
                      />
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
            </View>
          </TabView.Item>
          
          {/* Custom Products Tab */}
          <TabView.Item style={styles.tabContent}>
            <View style={styles.tabContentContainer}>
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
                      <FlatList
                        data={selectedCategoryProducts}
                        renderItem={renderProductItem}
                        keyExtractor={(item) => item._id}
                        numColumns={2}
                        columnWrapperStyle={styles.gridRow}
                        contentContainerStyle={styles.gridContainer}
                      />
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
            </View>
          </TabView.Item>
        </TabView>
      </View>
    </View>
  );
};

// Get screen width to calculate grid item width
const { width } = Dimensions.get('window');
const itemWidth = (width - 40) / 2; // 2 columns with padding

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
    flex: 1,
  },
  tabContentContainer: {
    flex: 1,
  },
  gridContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridItem: {
    width: itemWidth,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  placeholderText: {
    color: '#888',
    fontSize: 14,
  },
  productInfo: {
    padding: 10,
  },
  selectedItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  selectedBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#007AFF',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 5,
  },

  itemPrice: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },

  itemDescription: {
    fontSize: 12,
    color: '#6c757d',
    height: 32, // Limit to 2 lines
  },
  customProductIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 1,
  },
  customProductText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inlineLooseTag: {
    backgroundColor: '#8A2BE2', // Purple color for loose products
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 5,
  },
  inlinePackTag: {
    backgroundColor: '#FF6347', // Tomato color for packaged products
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 5,
  },
  looseProductText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  packProductText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  editButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#007AFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    flex: 1,
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
    flex: 1,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
  },
  buttonContainer: {
    paddingHorizontal: 10,
    marginTop: 15,
    marginBottom: 20,
    width: '100%',
  },
});

export default ProductsScreen;
