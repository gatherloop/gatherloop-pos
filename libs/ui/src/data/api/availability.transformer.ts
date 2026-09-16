// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  AvailabilityMovement as ApiAvailabilityMovement,
  AvailabilityProduct as ApiAvailabilityProduct,
  AvailabilityVariant as ApiAvailabilityVariant,
} from '../../../../api-contract/src';
import {
  AvailabilityForm,
  AvailabilityMovement,
  AvailabilityProduct,
  AvailabilityVariant,
} from '../../domain';

export function toAvailabilityVariant(
  variant: ApiAvailabilityVariant
): AvailabilityVariant {
  return {
    variantId: variant.variantId,
    variantName: variant.variantName,
    isAvailable: variant.isAvailable,
    availableQuantity: variant.availableQuantity,
    isSellable: variant.isSellable,
    sellableQuantity: variant.sellableQuantity,
  };
}

export function toAvailabilityProduct(
  product: ApiAvailabilityProduct
): AvailabilityProduct {
  return {
    productId: product.productId,
    productName: product.productName,
    categoryId: product.categoryId,
    categoryName: product.categoryName,
    availabilityTracking: product.availabilityTracking,
    isAvailable: product.isAvailable,
    availableQuantity: product.availableQuantity,
    isSellable: product.isSellable,
    sellableQuantity: product.sellableQuantity,
    variants: product.variants.map(toAvailabilityVariant),
  };
}

export function toAvailabilityMovement(
  movement: ApiAvailabilityMovement
): AvailabilityMovement {
  return {
    id: movement.id,
    productId: movement.productId,
    variantId: movement.variantId,
    delta: movement.delta,
    resultingQuantity: movement.resultingQuantity,
    reason: movement.reason,
    transactionId: movement.transactionId,
    note: movement.note,
    createdAt: movement.createdAt,
  };
}

export function toApiAvailabilityUpdateRequest(form: AvailabilityForm) {
  return {
    products: form.products.map(({ productId, isAvailable, availableQuantity }) => ({
      productId,
      isAvailable,
      availableQuantity,
    })),
    variants: form.variants.map(({ variantId, isAvailable, availableQuantity }) => ({
      variantId,
      isAvailable,
      availableQuantity,
    })),
  };
}
