import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Tab, TabView } from '@rneui/themed';
import useInventoryStore from '../../../store/inventoryStore';
import { Category } from '../../../services/inventoryService';
import CustomHeader from '../../../components/ui/CustomHeader';
import CustomButton from '../../../components/ui/CustomButton';
import { useNavigation } from '@react-navigation/native';
import { DefaultCategoriesNavigationProp } from '../../../navigation/types';

const DefaultCategories = () => {
  const navigation = useNavigation<DefaultCategoriesNavigationProp>();
  const {
    categories,
    fetchDefaultCategories,
    toggleCategorySelection,
    importSelectedCategories,
  } = useInventoryStore();

  const [categoryIndex, setCategoryIndex] = React.useState(0);

  useEffect(() => {
    fetchDefaultCategories();
  }, []);

  const handleCategorySelect = (categoryId: string) => {
    toggleCategorySelection(categoryId);
  };

  const handleImport = async () => {
    // TODO: Get branchId from context or storage
    const branchId = 'your-branch-id';
    await importSelectedCategories(branchId);
    navigation.goBack();
  };

  const renderCategoryItem = (category: Category) => {
    const isSelected = categories.default.selected.includes(category._id);
    
    return (
      <TouchableOpacity
        key={category._id}
        style={[styles.itemContainer, isSelected && styles.selectedItem]}
        onPress={() => handleCategorySelect(category._id)}
      >
        <Text style={styles.itemName}>{category.name}</Text>
        <Text style={styles.itemDescription}>{category.description || 'No description'}</Text>
      </TouchableOpacity>
    );
  };

  const defaultCategories = categories.default.items.filter(cat => cat.createdFromTemplate);
  const customCategories = categories.default.items.filter(cat => !cat.createdFromTemplate);

  return (
    <View style={styles.mainContainer}>
      <CustomHeader
        title="Select Categories"
      />
      <View style={styles.container}>
        <Tab
          value={categoryIndex}
          onChange={setCategoryIndex}
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
              {categories.default.loading ? (
                <Text style={styles.loadingText}>Loading categories...</Text>
              ) : categories.default.error ? (
                <Text style={styles.errorText}>{categories.default.error}</Text>
              ) : (
                <>
                  {defaultCategories.map(renderCategoryItem)}
                  {categories.default.selected.length > 0 && (
                    <View style={styles.importButtonContainer}>
                      <CustomButton
                        title="Import Selected Categories"
                        onPress={handleImport}
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </TabView.Item>
          
          <TabView.Item style={styles.tabContent}>
            <ScrollView style={styles.scrollView}>
              {categories.default.loading ? (
                <Text style={styles.loadingText}>Loading categories...</Text>
              ) : categories.default.error ? (
                <Text style={styles.errorText}>{categories.default.error}</Text>
              ) : (
                <>
                  {customCategories.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No custom categories available</Text>
                    </View>
                  ) : (
                    customCategories.map(renderCategoryItem)
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6c757d',
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
});

export default DefaultCategories; 