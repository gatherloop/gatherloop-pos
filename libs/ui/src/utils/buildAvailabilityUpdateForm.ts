import {
  AvailabilityForm,
  AvailabilityProduct,
  AvailabilityProductUpdate,
  AvailabilityVariantUpdate,
} from '../domain/entities';

export function buildAvailabilityUpdateForm(
  original: AvailabilityProduct[],
  edited: AvailabilityForm
): AvailabilityForm {
  const originalProductsById = new Map(
    original.map((product) => [product.productId, product])
  );
  const originalVariantsById = new Map(
    original
      .flatMap((product) => product.variants)
      .map((variant) => [variant.variantId, variant])
  );

  const products = edited.products.flatMap((edited): AvailabilityProductUpdate[] => {
    const originalProduct = originalProductsById.get(edited.productId);
    if (!originalProduct) return [];

    const update: AvailabilityProductUpdate = { productId: edited.productId };
    let changed = false;

    if (
      edited.isAvailable !== undefined &&
      edited.isAvailable !== originalProduct.isAvailable
    ) {
      update.isAvailable = edited.isAvailable;
      changed = true;
    }

    if (
      edited.availableQuantity !== undefined &&
      edited.availableQuantity !== originalProduct.availableQuantity
    ) {
      update.availableQuantity = edited.availableQuantity;
      changed = true;
    }

    return changed ? [update] : [];
  });

  const variants = edited.variants.flatMap((edited): AvailabilityVariantUpdate[] => {
    const originalVariant = originalVariantsById.get(edited.variantId);
    if (!originalVariant) return [];

    const update: AvailabilityVariantUpdate = { variantId: edited.variantId };
    let changed = false;

    if (
      edited.isAvailable !== undefined &&
      edited.isAvailable !== originalVariant.isAvailable
    ) {
      update.isAvailable = edited.isAvailable;
      changed = true;
    }

    if (
      edited.availableQuantity !== undefined &&
      edited.availableQuantity !== originalVariant.availableQuantity
    ) {
      update.availableQuantity = edited.availableQuantity;
      changed = true;
    }

    return changed ? [update] : [];
  });

  return { products, variants };
}

export function toAvailabilityUpdateForm(
  products: AvailabilityProduct[]
): AvailabilityForm {
  return {
    products: products.map((product) => ({
      productId: product.productId,
      isAvailable: product.isAvailable,
      availableQuantity: product.availableQuantity,
    })),
    variants: products.flatMap((product) =>
      product.variants.map((variant) => ({
        variantId: variant.variantId,
        isAvailable: variant.isAvailable,
        availableQuantity: variant.availableQuantity,
      }))
    ),
  };
}
