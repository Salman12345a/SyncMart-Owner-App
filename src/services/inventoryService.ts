import api from './api';
import {storage} from '../utils/storage';

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

export interface CustomProductData {
  name: string;
  price: number;
  discountPrice?: number;
  quantity?: number;
  unit?: string;
  categoryId: string;
  branchId: string;
  isPacket?: boolean;
  description?: string;
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
  
  // Custom Product APIs
  createCustomProduct: async (productData: CustomProductData) => {
    try {
      console.log(`Creating custom product for branch: ${productData.branchId}`);
      console.log('Request payload:', JSON.stringify(productData));
      
      // Make sure all required fields are present according to the API example
      const payload = {
        name: productData.name,
        price: productData.price,
        discountPrice: productData.discountPrice || 90,
        quantity: productData.quantity || 10,
        unit: productData.unit || 'kg',
        categoryId: productData.categoryId,
        branchId: productData.branchId,
        isPacket: productData.isPacket !== undefined ? productData.isPacket : false,
        description: productData.description || 'Test product description'
      };
      
      const response = await api.post(`/branch/${productData.branchId}/products`, payload);
      console.log('Create product response:', JSON.stringify(response.data));
      return response.data;
    } catch (error: any) {
      console.error('Error creating custom product:', error.response?.data || error.message);
      throw error;
    }
  },

  getProductImageUploadUrl: async (branchId: string, productId: string) => {
    try {
      console.log(`Getting image upload URL for product ${productId} in branch ${branchId}`);
      
      // The API endpoint might expect a query parameter for content type
      const response = await api.get(`/branch/${branchId}/products/${productId}/image-upload-url`, {
        params: {
          contentType: 'image/jpeg' // Explicitly specify content type as a parameter
        }
      });
      
      console.log('Image upload URL response:', JSON.stringify(response.data));
      return response.data;
    } catch (error: any) {
      console.error('Error getting image upload URL:', error.response?.data || error.message);
      throw error;
    }
  },

  updateProductImageUrl: async (productId: string, imageKey: string) => {
    try {
      const branchId = storage.getString('userId');
      if (!branchId) throw new Error('Branch ID not found');
      
      const response = await api.post(`/branch/products/${productId}/image-url`, {
        key: imageKey
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  uploadImageToPresignedUrl: async (presignedUrl: string, imageUri: string) => {
    try {
      // Determine content type based on image URI extension
      let contentType = 'image/jpeg';
      if (imageUri.toLowerCase().endsWith('.png')) {
        contentType = 'image/png';
      } else if (imageUri.toLowerCase().endsWith('.jpg') || imageUri.toLowerCase().endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      }
      
      console.log('Uploading image with content type:', contentType);
      
      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Upload to presigned URL using fetch with PUT method
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': contentType
        }
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Failed to upload image: ${uploadResponse.status} - ${errorText}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error in uploadImageToPresignedUrl:', error);
      throw error;
    }
  },
};



export default inventoryService; 