import { Product, ProductForm } from '../../domain/entities';
import { ProductRepository } from '../../domain/repositories/product';

const initialProducts: Product[] = [
  {
    id: 1,
    name: 'Product 1',
    category: { id: 1, name: 'Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
    imageUrl: 'https://example.com/1.jpg',
    saleType: 'purchase',
    options: [
      {
        id: 1,
        name: 'Size',
        values: [
          { id: 1, name: 'S' },
          { id: 2, name: 'M' },
        ],
      },
    ],
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Product 2',
    category: { id: 1, name: 'Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
    imageUrl: 'https://example.com/2.jpg',
    saleType: 'purchase',
    options: [
      {
        id: 2,
        name: 'Size',
        values: [
          { id: 3, name: 'S' },
          { id: 4, name: 'M' },
        ],
      },
    ],
    createdAt: '2024-03-21T00:00:00.000Z',
  },
];

export class MockProductRepository implements ProductRepository {
  products: Product[] = [...initialProducts];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  getProductList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    saleType: 'purchase' | 'rental' | 'all';
  }): { products: Product[]; totalItem: number } {
    return { products: [...this.products], totalItem: this.products.length };
  }

  async fetchProductList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    saleType: 'purchase' | 'rental' | 'all';
  }): Promise<{ products: Product[]; totalItem: number }> {
    if (this.shouldFail) throw new Error('Failed to fetch products');
    return Promise.resolve({
      products: [...this.products],
      totalItem: this.products.length,
    });
  }

  async fetchProductById(productId: number): Promise<Product> {
    if (this.shouldFail) throw new Error('Failed to fetch product');
    const product = this.products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');
    return { ...product };
  }

  async deleteProductById(productId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete product');
    this.products = this.products.filter((p) => p.id !== productId);
  }

  async createProduct(formValues: ProductForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create product');
    this.products.push({
      id: this.nextId++,
      name: formValues.name,
      description: formValues.description,
      category: { id: formValues.categoryId, name: '', createdAt: new Date().toISOString() },
      imageUrl: formValues.imageUrl,
      saleType: formValues.saleType,
      options: [],
      createdAt: new Date().toISOString(),
    });
  }

  async updateProduct(
    formValues: ProductForm,
    productId: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update product');
    const idx = this.products.findIndex((p) => p.id === productId);
    if (idx === -1) throw new Error('Product not found');
    this.products[idx] = {
      ...this.products[idx],
      name: formValues.name,
      description: formValues.description,
      imageUrl: formValues.imageUrl,
      saleType: formValues.saleType,
    };
  }

  reset() {
    this.products = [...initialProducts];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
