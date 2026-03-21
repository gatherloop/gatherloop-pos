// eslint-disable-next-line @nx/enforce-module-boundaries
import { Product as ApiProduct } from '../../../../api-contract/src';
import { Product, ProductForm } from '../../domain';
import { toCategory } from './category.transformer';

export function toProduct(product: ApiProduct): Product {
  return {
    id: product.id,
    createdAt: product.createdAt,
    name: product.name,
    imageUrl: product.imageUrl,
    category: toCategory(product.category),
    description: product.description ?? '',
    options: product.options,
    saleType: product.saleType,
  };
}

export function toApiProduct(form: ProductForm) {
  return {
    name: form.name,
    categoryId: form.categoryId,
    imageUrl: form.imageUrl,
    description: form.description,
    options: form.options,
    saleType: form.saleType,
  };
}
