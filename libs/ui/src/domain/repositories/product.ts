import { Product, ProductForm } from '../entities';

export interface ProductRepository {
  getProductList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    saleType: 'purchase' | 'rental' | 'all';
  }) => {
    products: Product[];
    totalItem: number;
  };

  fetchProductList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    saleType: 'purchase' | 'rental' | 'all';
  }) => Promise<{ products: Product[]; totalItem: number }>;

  fetchProductById: (productId: number) => Promise<Product>;

  deleteProductById: (productId: number) => Promise<void>;

  createProduct: (formValues: ProductForm) => Promise<void>;

  updateProduct: (formValues: ProductForm, productId: number) => Promise<void>;
}
