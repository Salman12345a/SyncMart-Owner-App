import { create } from 'zustand';
import { Category, Product, inventoryService } from '../services/inventoryService';

interface InventoryState {
  // Categories State
  categories: {
    default: {
      items: Category[];
      selected: string[];
      loading: boolean;
      error: string | null;
    };
    custom: {
      items: Category[];
      selected: string[];
      loading: boolean;
      error: string | null;
    };
    activeTab: 'default' | 'custom';
  };

  // Products State
  products: {
    default: {
      items: Record<string, Product[]>;
      selected: string[];
      loading: boolean;
      error: string | null;
    };
    custom: {
      items: Record<string, Product[]>;
      selected: string[];
      loading: boolean;
      error: string | null;
    };
    activeTab: 'default' | 'custom';
    selectedCategory: string | null;
  };

  // Actions
  setActiveCategoryTab: (tab: 'default' | 'custom') => void;
  setActiveProductTab: (tab: 'default' | 'custom') => void;
  setSelectedCategory: (categoryId: string | null) => void;
  
  // Category Actions
  fetchDefaultCategories: () => Promise<void>;
  fetchCustomCategories: (branchId: string) => Promise<void>;
  toggleCategorySelection: (categoryId: string) => void;
  importSelectedCategories: (branchId: string) => Promise<void>;
  clearCategorySelections: () => void;
  
  // Product Actions
  fetchDefaultProducts: (categoryId: string) => Promise<void>;
  fetchCustomProducts: (branchId: string, categoryId: string) => Promise<void>;
  toggleProductSelection: (productId: string) => void;
  importSelectedProducts: (branchId: string, categoryId: string) => Promise<void>;
  clearProductSelections: () => void;
}

const useInventoryStore = create<InventoryState>()((set, get) => ({
  // Initial Categories State
  categories: {
    default: {
      items: [],
      selected: [],
      loading: false,
      error: null,
    },
    custom: {
      items: [],
      selected: [],
      loading: false,
      error: null,
    },
    activeTab: 'default',
  },

  // Initial Products State
  products: {
    default: {
      items: {},
      selected: [],
      loading: false,
      error: null,
    },
    custom: {
      items: {},
      selected: [],
      loading: false,
      error: null,
    },
    activeTab: 'default',
    selectedCategory: null,
  },

  // Tab Actions
  setActiveCategoryTab: (tab: 'default' | 'custom') => 
    set((state) => ({ categories: { ...state.categories, activeTab: tab } })),
  
  setActiveProductTab: (tab: 'default' | 'custom') =>
    set((state) => ({ products: { ...state.products, activeTab: tab } })),
  
  setSelectedCategory: (categoryId: string | null) =>
    set((state) => ({ 
      products: { 
        ...state.products, 
        selectedCategory: categoryId,
        selected: [] // Clear product selections when changing category
      } 
    })),

  // Category Actions
  fetchDefaultCategories: async () => {
    set((state) => ({
      categories: {
        ...state.categories,
        default: { ...state.categories.default, loading: true, error: null }
      }
    }));

    try {
      const categories = await inventoryService.getDefaultCategories();
      set((state) => ({
        categories: {
          ...state.categories,
          default: {
            ...state.categories.default,
            items: categories,
            loading: false
          }
        }
      }));
    } catch (err: any) {
      const error = err?.message || 'Failed to fetch categories';
      set((state) => ({
        categories: {
          ...state.categories,
          default: {
            ...state.categories.default,
            error,
            loading: false
          }
        }
      }));
    }
  },

  fetchCustomCategories: async (branchId: string) => {
    set((state) => ({
      categories: {
        ...state.categories,
        custom: { ...state.categories.custom, loading: true, error: null }
      }
    }));

    try {
      const categories = await inventoryService.getCustomCategories(branchId);
      set((state) => ({
        categories: {
          ...state.categories,
          custom: {
            ...state.categories.custom,
            items: categories,
            loading: false
          }
        }
      }));
    } catch (err: any) {
      const error = err?.message || 'Failed to fetch custom categories';
      set((state) => ({
        categories: {
          ...state.categories,
          custom: {
            ...state.categories.custom,
            error,
            loading: false
          }
        }
      }));
    }
  },

  toggleCategorySelection: (categoryId: string) =>
    set((state) => {
      const activeTab = state.categories.activeTab;
      const selected = state.categories[activeTab].selected;
      const newSelected = selected.includes(categoryId)
        ? selected.filter(id => id !== categoryId)
        : [...selected, categoryId];

      return {
        categories: {
          ...state.categories,
          [activeTab]: {
            ...state.categories[activeTab],
            selected: newSelected
          }
        }
      };
    }),

  importSelectedCategories: async (branchId: string) => {
    const { selected } = get().categories.default;
    
    set((state) => ({
      categories: {
        ...state.categories,
        default: { ...state.categories.default, loading: true, error: null }
      }
    }));

    try {
      await inventoryService.importDefaultCategories(branchId, selected);
      set((state) => ({
        categories: {
          ...state.categories,
          default: {
            ...state.categories.default,
            selected: [],
            loading: false
          }
        }
      }));
    } catch (err: any) {
      const error = err?.message || 'Failed to import categories';
      set((state) => ({
        categories: {
          ...state.categories,
          default: {
            ...state.categories.default,
            error,
            loading: false
          }
        }
      }));
    }
  },

  clearCategorySelections: () =>
    set((state) => ({
      categories: {
        ...state.categories,
        [state.categories.activeTab]: {
          ...state.categories[state.categories.activeTab],
          selected: []
        }
      }
    })),

  // Product Actions
  fetchDefaultProducts: async (categoryId: string) => {
    set((state) => ({
      products: {
        ...state.products,
        default: { ...state.products.default, loading: true, error: null }
      }
    }));

    try {
      const products = await inventoryService.getDefaultProducts(categoryId);
      set((state) => ({
        products: {
          ...state.products,
          default: {
            ...state.products.default,
            items: {
              ...state.products.default.items,
              [categoryId]: products
            },
            loading: false
          }
        }
      }));
    } catch (err: any) {
      const error = err?.message || 'Failed to fetch products';
      set((state) => ({
        products: {
          ...state.products,
          default: {
            ...state.products.default,
            error,
            loading: false
          }
        }
      }));
    }
  },

  fetchCustomProducts: async (branchId: string, categoryId: string) => {
    set((state) => ({
      products: {
        ...state.products,
        custom: { ...state.products.custom, loading: true, error: null }
      }
    }));

    try {
      const products = await inventoryService.getCustomProducts(branchId, categoryId);
      set((state) => ({
        products: {
          ...state.products,
          custom: {
            ...state.products.custom,
            items: {
              ...state.products.custom.items,
              [categoryId]: products
            },
            loading: false
          }
        }
      }));
    } catch (err: any) {
      const error = err?.message || 'Failed to fetch custom products';
      set((state) => ({
        products: {
          ...state.products,
          custom: {
            ...state.products.custom,
            error,
            loading: false
          }
        }
      }));
    }
  },

  toggleProductSelection: (productId: string) =>
    set((state) => {
      const activeTab = state.products.activeTab;
      const selected = state.products[activeTab].selected;
      const newSelected = selected.includes(productId)
        ? selected.filter(id => id !== productId)
        : [...selected, productId];

      return {
        products: {
          ...state.products,
          [activeTab]: {
            ...state.products[activeTab],
            selected: newSelected
          }
        }
      };
    }),

  importSelectedProducts: async (branchId: string, categoryId: string) => {
    const { selected } = get().products.default;
    
    set((state) => ({
      products: {
        ...state.products,
        default: { ...state.products.default, loading: true, error: null }
      }
    }));

    try {
      await inventoryService.importDefaultProducts(branchId, categoryId, selected);
      set((state) => ({
        products: {
          ...state.products,
          default: {
            ...state.products.default,
            selected: [],
            loading: false
          }
        }
      }));
    } catch (err: any) {
      const error = err?.message || 'Failed to import products';
      set((state) => ({
        products: {
          ...state.products,
          default: {
            ...state.products.default,
            error,
            loading: false
          }
        }
      }));
    }
  },

  clearProductSelections: () =>
    set((state) => ({
      products: {
        ...state.products,
        [state.products.activeTab]: {
          ...state.products[state.products.activeTab],
          selected: []
        }
      }
    })),
}));

export default useInventoryStore; 