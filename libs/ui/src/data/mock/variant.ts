import { Variant, VariantForm } from '../../domain/entities';
import { VariantRepository } from '../../domain/repositories/variant';

const mockProduct = {
  id: 1,
  name: 'Product 1',
  category: { id: 1, name: 'Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
  imageUrl: 'https://example.com/1.jpg',
  saleType: 'purchase' as const,
  options: [],
  createdAt: '2024-03-20T00:00:00.000Z',
};

const initialVariants: Variant[] = [
  {
    id: 1,
    name: 'Variant 1',
    price: 50000,
    materials: [],
    product: mockProduct,
    createdAt: '2024-03-20T00:00:00.000Z',
    values: [],
  },
  {
    id: 2,
    name: 'Variant 2',
    price: 75000,
    materials: [],
    product: mockProduct,
    createdAt: '2024-03-21T00:00:00.000Z',
    values: [],
  },
];

export class MockVariantRepository implements VariantRepository {
  variants: Variant[] = [...initialVariants];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  getVariantList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    productId?: number;
    optionValueIds: number[];
  }): { variants: Variant[]; totalItem: number } {
    return { variants: [...this.variants], totalItem: this.variants.length };
  }

  async fetchVariantList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
    productId?: number;
    optionValueIds: number[];
  }): Promise<{ variants: Variant[]; totalItem: number }> {
    if (this.shouldFail) throw new Error('Failed to fetch variants');
    return Promise.resolve({
      variants: [...this.variants],
      totalItem: this.variants.length,
    });
  }

  async fetchVariantById(variantId: number): Promise<Variant> {
    if (this.shouldFail) throw new Error('Failed to fetch variant');
    const variant = this.variants.find((v) => v.id === variantId);
    if (!variant) throw new Error('Variant not found');
    return { ...variant };
  }

  async deleteVariantById(variantId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete variant');
    this.variants = this.variants.filter((v) => v.id !== variantId);
  }

  async createVariant(formValues: VariantForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create variant');
    this.variants.push({
      id: this.nextId++,
      name: formValues.name,
      price: formValues.price,
      description: formValues.description,
      materials: [],
      product: mockProduct,
      createdAt: new Date().toISOString(),
      values: [],
    });
  }

  async updateVariant(
    formValues: VariantForm,
    variantId: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update variant');
    const idx = this.variants.findIndex((v) => v.id === variantId);
    if (idx === -1) throw new Error('Variant not found');
    this.variants[idx] = {
      ...this.variants[idx],
      name: formValues.name,
      price: formValues.price,
      description: formValues.description,
    };
  }

  reset() {
    this.variants = [...initialVariants];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
