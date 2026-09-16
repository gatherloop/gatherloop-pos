import { AvailabilityProduct } from '../domain/entities';
import {
  buildAvailabilityUpdateForm,
  toAvailabilityUpdateForm,
} from './buildAvailabilityUpdateForm';

const products: AvailabilityProduct[] = [
  {
    productId: 1,
    productName: 'Es Kopi Susu',
    categoryId: 1,
    categoryName: 'Minuman',
    availabilityTracking: 'none',
    isAvailable: true,
    isSellable: true,
    variants: [
      { variantId: 1, variantName: 'Vanilla', isAvailable: false, isSellable: false },
      { variantId: 2, variantName: 'Banana', isAvailable: true, isSellable: true },
    ],
  },
  {
    productId: 2,
    productName: 'Pancong',
    categoryId: 2,
    categoryName: 'Snack',
    availabilityTracking: 'product',
    isAvailable: true,
    availableQuantity: 5,
    isSellable: true,
    sellableQuantity: 5,
    variants: [
      { variantId: 3, variantName: 'Choco', isAvailable: true, isSellable: true },
      { variantId: 4, variantName: 'Matcha', isAvailable: true, isSellable: true },
    ],
  },
];

describe('buildAvailabilityUpdateForm', () => {
  it('returns no rows when nothing changed', () => {
    const edited = toAvailabilityUpdateForm(products);

    const diff = buildAvailabilityUpdateForm(products, edited);

    expect(diff).toEqual({ products: [], variants: [] });
  });

  it('includes only the rows that changed', () => {
    const edited = toAvailabilityUpdateForm(products);
    edited.variants[0].isAvailable = true;
    edited.products[1].availableQuantity = 3;

    const diff = buildAvailabilityUpdateForm(products, edited);

    expect(diff).toEqual({
      products: [{ productId: 2, availableQuantity: 3 }],
      variants: [{ variantId: 1, isAvailable: true }],
    });
  });

  it('includes only the fields that changed on a row, not the whole row', () => {
    const edited = toAvailabilityUpdateForm(products);
    edited.products[1].isAvailable = false;

    const diff = buildAvailabilityUpdateForm(products, edited);

    expect(diff.products).toEqual([{ productId: 2, isAvailable: false }]);
  });

  it('ignores rows for a product or variant no longer present', () => {
    const edited = toAvailabilityUpdateForm(products);
    edited.products.push({ productId: 999, isAvailable: false });
    edited.variants.push({ variantId: 999, isAvailable: false });

    const diff = buildAvailabilityUpdateForm(products, edited);

    expect(diff).toEqual({ products: [], variants: [] });
  });
});

describe('toAvailabilityUpdateForm', () => {
  it('maps every product and variant into a full editable form', () => {
    const form = toAvailabilityUpdateForm(products);

    expect(form).toEqual({
      products: [
        { productId: 1, isAvailable: true, availableQuantity: undefined },
        { productId: 2, isAvailable: true, availableQuantity: 5 },
      ],
      variants: [
        { variantId: 1, isAvailable: false, availableQuantity: undefined },
        { variantId: 2, isAvailable: true, availableQuantity: undefined },
        { variantId: 3, isAvailable: true, availableQuantity: undefined },
        { variantId: 4, isAvailable: true, availableQuantity: undefined },
      ],
    });
  });
});
