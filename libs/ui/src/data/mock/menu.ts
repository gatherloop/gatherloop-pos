import { Category, Product, Variant } from '../../domain/entities';
import { MenuRepository } from '../../domain/repositories/menu';

const initialCategories: Category[] = [
  {
    id: 1,
    name: 'Minuman',
    station: 'BAR',
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Makanan',
    station: 'KITCHEN',
    createdAt: '2024-03-20T00:00:00.000Z',
  },
];

const initialProducts: Product[] = [
  {
    id: 1,
    name: 'Es Kopi Susu',
    description: 'Kopi susu gula aren dengan es',
    category: initialCategories[0],
    imageUrl: '',
    saleType: 'purchase',
    status: 'published',
    options: [
      {
        id: 1,
        name: 'Ukuran',
        values: [
          { id: 1, name: 'Regular' },
          { id: 2, name: 'Large' },
        ],
      },
    ],
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Nasi Goreng',
    description: '',
    category: initialCategories[1],
    imageUrl: '',
    saleType: 'purchase',
    status: 'published',
    options: [],
    createdAt: '2024-03-21T00:00:00.000Z',
  },
];

const initialVariants: Variant[] = [
  {
    id: 1,
    name: 'Es Kopi Susu - Regular',
    price: 18000,
    materials: [],
    product: initialProducts[0],
    createdAt: '2024-03-20T00:00:00.000Z',
    values: [
      {
        id: 1,
        variantId: 1,
        optionValueId: 1,
        optionValue: { id: 1, name: 'Regular' },
      },
    ],
    pricingTiers: [],
  },
  {
    id: 2,
    name: 'Es Kopi Susu - Large',
    price: 22000,
    materials: [],
    product: initialProducts[0],
    createdAt: '2024-03-20T00:00:00.000Z',
    values: [
      {
        id: 2,
        variantId: 2,
        optionValueId: 2,
        optionValue: { id: 2, name: 'Large' },
      },
    ],
    pricingTiers: [],
  },
  {
    id: 3,
    name: 'Nasi Goreng',
    price: 25000,
    materials: [],
    product: initialProducts[1],
    createdAt: '2024-03-21T00:00:00.000Z',
    values: [],
    pricingTiers: [],
  },
];

export class MockMenuRepository implements MenuRepository {
  products: Product[] = [...initialProducts];
  categories: Category[] = [...initialCategories];
  variants: Variant[] = [...initialVariants];

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  fetchMenu: MenuRepository['fetchMenu'] = async ({ query }) => {
    if (this.shouldFail) throw new Error('Failed to fetch menu');
    const products = query
      ? this.products.filter((product) =>
          product.name.toLowerCase().includes(query.toLowerCase())
        )
      : this.products;
    return { products: [...products], categories: [...this.categories] };
  };

  fetchProductById: MenuRepository['fetchProductById'] = async (
    productId
  ) => {
    if (this.shouldFail) throw new Error('Failed to fetch product');
    const product = this.products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');
    return { ...product };
  };

  resolveVariant: MenuRepository['resolveVariant'] = async ({
    productId,
    optionValueIds,
  }) => {
    if (this.shouldFail) throw new Error('Failed to resolve variant');
    const wanted = [...optionValueIds].sort().join(',');
    const variant = this.variants.find(
      (v) =>
        v.product.id === productId &&
        [...v.values.map((value) => value.optionValueId)]
          .sort()
          .join(',') === wanted
    );
    if (!variant) throw new Error('Variant not found');
    return { ...variant };
  };

  reset() {
    this.products = [...initialProducts];
    this.categories = [...initialCategories];
    this.variants = [...initialVariants];
    this.shouldFail = false;
  }
}
