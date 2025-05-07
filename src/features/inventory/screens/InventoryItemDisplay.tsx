import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ToastAndroid, ActivityIndicator } from 'react-native';
import { Icon } from '@rneui/themed';
import api from '../../../services/api';
import { Tab, TabView } from '@rneui/themed';
import useInventoryStore from '../../../store/inventoryStore';
import { Category, Product } from '../../../services/inventoryService';
import CustomHeader from '../../../components/ui/CustomHeader';
import CustomButton from '../../../components/ui/CustomButton';
import { useNavigation, useRoute } from '@react-navigation/native';
import { InventoryItemDisplayNavigationProp } from '../../../navigation/types';
import { storage } from '../../../utils/storage';

const InventoryItemDisplay = () => {
  const navigation = useNavigation<InventoryItemDisplayNavigationProp>();
  const route = useRoute();
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
  // productIndex state removed as it's now in ProductsScreen
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [isRemoving, setIsRemoving] = React.useState(false);

  // Get branchId from MMKV storage (userId)
  const branchId = storage.getString('userId');
  console.log('BranchId (userId) from MMKV storage:', branchId);

  // Add a refresh effect that triggers when returning from upload
  useEffect(() => {
    const params = route.params as { refresh?: boolean; refreshTimestamp?: number } | undefined;
    if (params?.refresh && branchId) {
      console.log('Refreshing categories due to navigation parameter');
      fetchBranchCategories(branchId);
      
      // After refresh, optionally set the tab to custom categories
      setCategoryIndex(1); // Switch to custom tab
      setActiveCategoryTab('custom');
    }
  }, [route.params, branchId, fetchBranchCategories, setActiveCategoryTab]);

  // Initial categories fetch
  useEffect(() => {
    if (branchId) {
      fetchBranchCategories(branchId);
    }
  }, [branchId, fetchBranchCategories]);

  const handleAddInventory = () => {
    navigation.navigate('DefaultCategories');
  };

  // Product handling functions moved to ProductsScreen

  const handleCategoryPress = (category: Category) => {
    navigation.navigate('ProductsScreen', {
      categoryId: category._id,
      categoryName: category.name,
      isDefault: categories.activeTab === 'default',
      defaultCategoryId: category.defaultCategoryId
    });
  };

  const handleRemoveSelectedCategories = async () => {
    if (!branchId || selectedCategories.length === 0) return;
    
    setIsRemoving(true);
    try {
      console.log('Removing categories with IDs:', selectedCategories);
      
      // Use the api service which handles the base URL, authentication, and error handling
      // The endpoint path matches what was shown in the screenshot
      const response = await api.put(`/branch/${branchId}/categories/remove-imported`, {
        categoryIds: selectedCategories
      });
      
      console.log('Response data:', response.data);
      
      // Show success message
      ToastAndroid.show('Categories removed successfully', ToastAndroid.SHORT);
      
      // Reset selection mode and refresh categories
      setSelectionMode(false);
      setSelectedCategories([]);
      fetchBranchCategories(branchId);
    } catch (error) {
      console.error('Error removing categories:', error);
      // More detailed error message
      if (error instanceof Error) {
        ToastAndroid.show(`Error: ${error.message}`, ToastAndroid.LONG);
      } else {
        ToastAndroid.show('Failed to remove categories', ToastAndroid.LONG);
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const renderCategoryItem = (category: Category) => {
    const isSelected = selectedCategories.includes(category._id);
    
    return (
      <TouchableOpacity 
        key={category._id} 
        style={[styles.gridItem, selectionMode && isSelected && styles.categorySelectedItem]}
        onPress={() => {
          if (selectionMode) {
            toggleCategorySelection(category._id);
          } else {
            handleCategoryPress(category);
          }
        }}
      >
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
        )}
        {category.imageUrl ? (
          <Image source={{ uri: category.imageUrl }} style={styles.categoryImage} />
        ) : null}
        <Text style={styles.itemName} numberOfLines={1}>{category.name}</Text>
      </TouchableOpacity>
    );
  };

  // renderProductItem moved to ProductsScreen

  const renderCategories = () => {
    const activeCategories = categories.branch;
    // Default and custom filtered lists
    const defaultCategories = activeCategories.items.filter(
      category => category.createdFromTemplate || !!category.defaultCategoryId
    );
    const customCategories = activeCategories.items.filter(
      category => !category.createdFromTemplate && !category.defaultCategoryId
    );

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
          {/* Default Tab */}
          <TabView.Item style={styles.tabContent}>
            <ScrollView style={styles.scrollView}>
              {activeCategories.loading ? (
                <Text style={styles.loadingText}>Loading categories...</Text>
              ) : activeCategories.error ? (
                <Text style={styles.errorText}>{activeCategories.error}</Text>
              ) : (
                <>
                  {defaultCategories.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No default categories added yet</Text>
                      <CustomButton title="Add Inventory" onPress={handleAddInventory} />
                    </View>
                  ) : (
                    <>
                      <View style={styles.headerContainer}>
                        <Text style={styles.sectionTitle}>Imported Default Categories</Text>
                        {defaultCategories.length > 0 && (
                          <TouchableOpacity
                            style={styles.deleteIcon}
                            onPress={() => {
                              setSelectionMode(!selectionMode);
                              setSelectedCategories([]);
                            }}
                          >
                            <Icon name={selectionMode ? "close" : "delete"} size={24} color="#dc3545" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.gridContainer}>
                        {defaultCategories.map(renderCategoryItem)}
                      </View>
                      {selectionMode ? (
                        <View style={styles.removeButtonContainer}>
                          {isRemoving ? (
                            <ActivityIndicator size="small" color="#007AFF" />
                          ) : (
                            <CustomButton 
                              title="Remove Selected Categories" 
                              onPress={handleRemoveSelectedCategories}
                              disabled={selectedCategories.length === 0} 
                            />
                          )}
                        </View>
                      ) : (
                        <View style={styles.addButtonContainer}>
                          <CustomButton title="Add Inventory" onPress={handleAddInventory} />
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          </TabView.Item>
          {/* Custom Tab */}
          <TabView.Item style={styles.tabContent}>
            <ScrollView style={styles.scrollView}>
              {activeCategories.loading ? (
                <Text style={styles.loadingText}>Loading categories...</Text>
              ) : activeCategories.error ? (
                <Text style={styles.errorText}>{activeCategories.error}</Text>
              ) : (
                <>
                  {customCategories.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No custom categories added yet</Text>
                      <CustomButton title="Create Category" onPress={() => navigation.navigate('CreateCustomCategories')} />
                    </View>
                  ) : (
                    <>
                      <Text style={styles.sectionTitle}>Created Custom Categories</Text>
                    <View style={styles.gridContainer}>
                      {customCategories.map(renderCategoryItem)}
                    </View>
                      <View style={styles.addButtonContainer}>
                        <CustomButton title="Create Category" onPress={() => navigation.navigate('CreateCustomCategories')} />
                      </View>
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

  // renderProducts function removed as it is now moved to ProductsScreen

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
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteIcon: {
    padding: 8,
  },
  checkboxContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categorySelectedItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 2,
  },
  removeButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
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
    width: '100%',
    height: 120,
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
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginLeft: 4,
  },
});

export default InventoryItemDisplay;
