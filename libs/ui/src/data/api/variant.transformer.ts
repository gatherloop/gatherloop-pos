// eslint-disable-next-line @nx/enforce-module-boundaries
import { Variant as ApiVariant } from '../../../../api-contract/src';
import { Variant, VariantForm } from '../../domain';
import { toMaterial } from './material.transformer';

export function toVariant(variant: ApiVariant): Variant {
  return {
    id: variant.id,
    createdAt: variant.createdAt,
    name: variant.name,
    price: variant.price,
    materials: variant.materials.map(({ amount, material, id }) => ({
      id,
      materialId: material.id,
      material: toMaterial(material),
      amount,
    })),
    description: variant.description ?? '',
    product: {
      category: {
        createdAt: variant.product.category.createdAt,
        id: variant.product.category.id,
        name: variant.product.category.name,
      },
      createdAt: variant.product.createdAt,
      id: variant.product.id,
      name: variant.product.name,
      description: variant.product.description ?? '',
      options: variant.product.options,
      imageUrl: variant.product.imageUrl,
      saleType: variant.product.saleType,
    },
    values: variant.values.map((value) => ({
      id: value.id,
      variantId: value.variantId,
      optionValueId: value.optionValue.id,
      optionValue: {
        id: value.optionValue.id,
        name: value.optionValue.name,
      },
    })),
  };
}

export function toApiVariant(form: VariantForm) {
  return {
    name: form.name,
    productId: form.productId,
    price: form.price,
    materials: form.materials.map(({ materialId, amount, id }) => ({
      id,
      amount,
      materialId,
    })),
    description: form.description,
    values: form.values.map(({ id, optionValueId }) => ({
      id,
      optionValueId,
    })),
  };
}
