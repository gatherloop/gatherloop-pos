import { AvailabilityForm, AvailabilityProduct } from '../../domain/entities';
import { AvailabilityRepository } from '../../domain/repositories';

const initialProducts: AvailabilityProduct[] = [
  {
    productId: 1,
    productName: 'Es Kopi Susu',
    categoryId: 1,
    categoryName: 'Minuman',
    availabilityTracking: 'none',
    isAvailable: true,
    isSellable: true,
    variants: [
      {
        variantId: 1,
        variantName: 'Vanilla',
        isAvailable: false,
        isSellable: false,
      },
      {
        variantId: 2,
        variantName: 'Banana',
        isAvailable: true,
        isSellable: true,
      },
      {
        variantId: 3,
        variantName: 'Hazelnut',
        isAvailable: true,
        isSellable: true,
      },
    ],
  },
  {
    productId: 2,
    productName: 'Soft Cookies',
    categoryId: 2,
    categoryName: 'Snack',
    availabilityTracking: 'variant',
    isAvailable: true,
    isSellable: true,
    sellableQuantity: 9,
    variants: [
      {
        variantId: 4,
        variantName: 'Choco',
        isAvailable: true,
        availableQuantity: 6,
        isSellable: true,
        sellableQuantity: 6,
      },
      {
        variantId: 5,
        variantName: 'Red Velvet',
        isAvailable: true,
        availableQuantity: 3,
        isSellable: true,
        sellableQuantity: 3,
      },
    ],
  },
  {
    productId: 3,
    productName: 'Pancong',
    categoryId: 2,
    categoryName: 'Snack',
    availabilityTracking: 'product',
    isAvailable: true,
    availableQuantity: 5,
    isSellable: true,
    sellableQuantity: 5,
    variants: [
      {
        variantId: 6,
        variantName: 'Choco',
        isAvailable: true,
        isSellable: true,
        sellableQuantity: 5,
      },
      {
        variantId: 7,
        variantName: 'Matcha',
        isAvailable: true,
        isSellable: true,
        sellableQuantity: 5,
      },
      {
        variantId: 8,
        variantName: 'Vanilla',
        isAvailable: true,
        isSellable: true,
        sellableQuantity: 5,
      },
    ],
  },
];

function cloneProducts(products: AvailabilityProduct[]): AvailabilityProduct[] {
  return products.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => ({ ...variant })),
  }));
}

export class MockAvailabilityRepository implements AvailabilityRepository {
  products: AvailabilityProduct[] = cloneProducts(initialProducts);

  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  async fetchAvailabilityList(): Promise<AvailabilityProduct[]> {
    if (this.shouldFail) throw new Error('Failed to fetch availability');
    return cloneProducts(this.products);
  }

  async updateAvailability(form: AvailabilityForm): Promise<AvailabilityProduct[]> {
    if (this.shouldFail) throw new Error('Failed to update availability');

    for (const update of form.products) {
      const product = this.products.find(
        (p) => p.productId === update.productId
      );
      if (!product) continue;
      if (update.isAvailable !== undefined) {
        product.isAvailable = update.isAvailable;
      }
      if (update.availableQuantity !== undefined) {
        product.availableQuantity = update.availableQuantity;
      }
    }

    for (const update of form.variants) {
      const variant = this.products
        .flatMap((p) => p.variants)
        .find((v) => v.variantId === update.variantId);
      if (!variant) continue;
      if (update.isAvailable !== undefined) {
        variant.isAvailable = update.isAvailable;
      }
      if (update.availableQuantity !== undefined) {
        variant.availableQuantity = update.availableQuantity;
      }
    }

    return cloneProducts(this.products);
  }

  reset() {
    this.products = cloneProducts(initialProducts);
    this.shouldFail = false;
  }
}
