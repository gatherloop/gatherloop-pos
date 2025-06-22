import { Product, ProductForm } from '../entities';

export type ProductListParams = {
  page: number;
  itemPerPage: number;
  query: string;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
};

export interface ProductRepository {
  getProductList: (params: ProductListParams) => {
    products: Product[];
    totalItem: number;
  };

  fetchProductList: (
    params: ProductListParams
  ) => Promise<{ products: Product[]; totalItem: number }>;

  fetchProductById: (productId: number) => Promise<Product>;

  deleteProductById: (productId: number) => Promise<void>;

  createProduct: (formValues: ProductForm) => Promise<void>;

  updateProduct: (formValues: ProductForm, productId: number) => Promise<void>;
}
