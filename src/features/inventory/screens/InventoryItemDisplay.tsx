import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Tab, TabView } from '@rneui/themed';
import useInventoryStore from '../../../store/inventoryStore';
import { Category, Product } from '../../../services/inventoryService';
import CustomHeader from '../../../components/ui/CustomHeader';
import CustomButton from '../../../components/ui/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { InventoryItemDisplayNavigationProp } from '../../../navigation/types';
import { storage } from '../../../utils/storage';

const InventoryItemDisplay = () => {
  const navigation = useNavigation<InventoryItemDisplayNavigationProp>();
  const {
    categories,
    products,
    fetchBranchCategories,
    setActiveCategoryTab,
    setActiveProductTab,
    fetchDefaultProducts,
    fetchCustomProducts,
    toggleProductSelection,
    importSelectedProducts,
    setSelectedCategory,
  } = useInventoryStore();

  const [categoryIndex, setCategoryIndex] = React.useState(0);
  const [productIndex, setProductIndex] = React.useState(0);

  // Get branchId from MMKV storage (userId)
  const branchId = storage.getString('userId');
  console.log('BranchId (userId) from MMKV storage:', branchId);

  useEffect(() => {
    if (branchId) {
      fetchBranchCategories(branchId);
    }
  }, [branchId, fetchBranchCategories]);

  const handleAddInventory = () => {
    navigation.navigate('DefaultCategories');
  };

  const handleProductSelect = (productId: string) => {
    toggleProductSelection(productId);
  };

  const handleProductImport = async () => {
    if (!products.selectedCategory || !branchId) return;
    await importSelectedProducts(branchId, products.selectedCategory);
  };

  const handleCategoryPress = (category: Category) => {
    setSelectedCategory(category._id);
    if (categories.activeTab === 'default') {
      fetchDefaultProducts(category._id);
    } else {
      if (branchId) {
        fetchCustomProducts(branchId, category._id);
      }
    }
  };

  const renderCategoryItem = (category: Category) => {
    return (
      <View key={category._id} style={styles.gridItem}>
        {category.imageUrl ? (
          <Image source={{ uri: category.imageUrl }} style={styles.categoryImage} />
        ) : null}
        <Text style={styles.itemName} numberOfLines={1}>{category.name}</Text>
      </View>
    );
  };

  const renderProductItem = (product: Product) => {
    const isSelected = products[products.activeTab].selected.includes(product._id);
    
    return (
      <TouchableOpacity
        key={product._id}
        style={[styles.itemContainer, isSelected && styles.selectedItem]}
        onPress={() => handleProductSelect(product._id)}
      >
        <Text style={styles.itemName}>{product.name}</Text>
        <Text style={styles.itemPrice}>₹{product.price}</Text>
        <Text style={styles.itemDescription}>{product.description || 'No description'}</Text>
      </TouchableOpacity>
    );
  };

  const renderCategories = () => {
    const activeCategories = categories.branch;
    const filteredCategories = activeCategories.items.filter(category => 
      categories.activeTab === 'default'
        ? category.createdFromTemplate || !!category.defaultCategoryId
        : !category.createdFromTemplate && !category.defaultCategoryId
    );
    console.log('ActiveTab:', categories.activeTab, 'FilteredCategories:', filteredCategories);

    return (
      <View style={styles.container}>
        <Tab
          value={categoryIndex}
          onChange={(index) => {
            setCategoryIndex(index);
            setActiveCategoryTab(index === 0 ? 'default' : 'custom');
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

        <TabView value={categoryIndex} onChange={setCategoryIndex} animationType="spring">
          <TabView.Item style={styles.tabContent}>
            <ScrollView style={styles.scrollView}>
              {activeCategories.loading ? (
                <Text style={styles.loadingText}>Loading categories...</Text>
              ) : activeCategories.error ? (
                <Text style={styles.errorText}>{activeCategories.error}</Text>
              ) : (
                <>
                  {filteredCategories.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        {categories.activeTab === 'default' 
                          ? 'No default categories added yet'
                          : 'No custom categories added yet'}
                      </Text>
                      {categories.activeTab === 'default' && (
                        <CustomButton
                          title="Add Inventory"
                          onPress={handleAddInventory}
                        />
                      )}
                    </View>
                  ) : (
                    <>
                      <View style={styles.gridContainer}>
                        {filteredCategories.map(renderCategoryItem)}
                      </View>
                      {categories.activeTab === 'default' && (
                        <View style={styles.addButtonContainer}>
                          <CustomButton
                            title="Add Inventory"
                            onPress={handleAddInventory}
                          />
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </TabView.Item>
        </TabView>
      </View>
    );
  };

  const renderProducts = () => {
    if (!products.selectedCategory) return null;

    const activeProducts = products[products.activeTab];
    const selectedCategoryProducts = activeProducts.items[products.selectedCategory] || [];

    return (
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
          <TabView.Item style={styles.tabContent}>
            <ScrollView style={styles.scrollView}>
              {activeProducts.loading ? (
                <Text style={styles.loadingText}>Loading products...</Text>
              ) : activeProducts.error ? (
                <Text style={styles.errorText}>{activeProducts.error}</Text>
              ) : (
                <>
                  {selectedCategoryProducts.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        {products.activeTab === 'default'
                          ? 'No default products added yet'
                          : 'No custom products added yet'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {selectedCategoryProducts.map(renderProductItem)}
                      {products.activeTab === 'default' && activeProducts.selected.length > 0 && (
                        <View style={styles.importButtonContainer}>
                          <CustomButton
                            title="Import Selected Products"
                            onPress={handleProductImport}
                          />
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </TabView.Item>
        </TabView>
      </View>
    );
  };

  if (!branchId) {
    return (
      <View style={styles.mainContainer}>
        <View style={styles.emptyState}>
          <Text style={styles.loadingText}>Loading branch information...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {renderCategories()}
      {renderProducts()}
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
  },
  tabIndicator: {
    backgroundColor: '#007AFF',
    height: 2,
  },
  tabTitle: {
    fontSize: 16,
    color: '#007AFF',
  },
  tabContent: {
    width: '100%',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  itemContainer: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 0,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#28a745',
    marginBottom: 4,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#dc3545',
  },
  importButtonContainer: {
    marginTop: 16,
  },
  addButtonContainer: {
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'center',
    resizeMode: 'cover',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
});

export default InventoryItemDisplay;
