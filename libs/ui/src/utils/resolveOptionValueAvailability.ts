import { Product, Variant } from '../domain/entities';

export function resolveOptionValueAvailability(
  product: Product,
  variants: Variant[],
  selectedOptionValueIds: number[]
): Record<number, boolean> {
  const availabilityByOptionValueId: Record<number, boolean> = {};

  for (const option of product.options) {
    const selectedOptionValueIdsFromOtherOptions = selectedOptionValueIds.filter(
      (id) => !option.values.some((value) => value.id === id)
    );

    for (const value of option.values) {
      const candidateOptionValueIds = [
        ...selectedOptionValueIdsFromOtherOptions,
        value.id,
      ];

      availabilityByOptionValueId[value.id] = variants.some(
        (variant) =>
          variant.isSellable &&
          candidateOptionValueIds.every((id) =>
            variant.values.some((variantValue) => variantValue.optionValueId === id)
          )
      );
    }
  }

  return availabilityByOptionValueId;
}
