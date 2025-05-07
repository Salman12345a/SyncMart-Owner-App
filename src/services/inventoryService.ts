import api from './api';

export interface Category {
  _id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdFromTemplate: boolean;
  defaultCategoryId?: string;
}

export interface Product {
  _id: string;
  name: string;
  imageUrl: string;
  isActive: boolean;
  description?: string;
  price: number;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  createdFromTemplate: boolean;
}

export const inventoryService = {
  // Category related APIs
  getDefaultCategories: async () => {
    try {
      const response = await api.get('/admin/default-categories');
      // Ensure all categories from this endpoint have createdFromTemplate set to true
      return response.data.map((category: Category) => ({
        ...category,
        createdFromTemplate: true
      }));
    } catch (error) {
      throw error;
    }
  },

  getCustomCategories: async (branchId: string) => {
    try {
      const response = await api.get(`/branch/${branchId}/categories`);
      // Ensure all categories from this endpoint have createdFromTemplate set to false
      return response.data.map((category: Category) => ({
        ...category,
        createdFromTemplate: false
      }));
    } catch (error) {
      throw error;
    }
  },

  importDefaultCategories: async (branchId: string, categoryIds: string[]) => {
    try {
      const response = await api.post(`/branch/${branchId}/categories/import-default`, {
        categoryIds,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Product related APIs
  getDefaultProducts: async (defaultCategoryId: string) => {
    try {
      const response = await api.get(`/admin/default-categories/${defaultCategoryId}/products`);
      // Ensure all products from this endpoint have createdFromTemplate set to true
      return response.data.map((product: Product) => ({
        ...product,
        createdFromTemplate: true
      }));
    } catch (error) {
      throw error;
    }
  },

  getCustomProducts: async (branchId: string, categoryId: string) => {
    try {
      const response = await api.get(`/branch/${branchId}/categories/${categoryId}/products`);
      // Ensure all products from this endpoint have createdFromTemplate set to false
      return response.data.map((product: Product) => ({
        ...product,
        createdFromTemplate: false
      }));
    } catch (error) {
      throw error;
    }
  },

  // Get branch-specific products for a category (imported products)
  getBranchCategoryProducts: async (branchId: string, categoryId: string) => {
    try {
      const response = await api.get(`/branch/${branchId}/categories/${categoryId}/products`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  importDefaultProducts: async (branchId: string, categoryId: string, productIds: string[]) => {
    try {
      const response = await api.post(`/branch/${branchId}/categories/${categoryId}/import-products`, {
        productIds,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default inventoryService; 