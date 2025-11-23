import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  variantCreate,
  variantDeleteById,
  variantFindById,
  variantFindByIdQueryKey,
  variantList,
  VariantList200,
  variantListQueryKey,
  variantUpdateById,
  Variant as ApiVariant,
  Category as ApiCategory,
} from '../../../../api-contract/src';
import { Category, Variant, VariantRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

export class ApiVariantRepository implements VariantRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchVariantById = (
    variantId: number,
    options?: Partial<RequestConfig>
  ): Promise<Variant> => {
    return this.client
      .fetchQuery({
        queryKey: variantFindByIdQueryKey(variantId),
        queryFn: () => variantFindById(variantId, options),
      })
      .then(({ data }) => variantTransformers.variant(data));
  };

  createVariant: VariantRepository['createVariant'] = (formValues) => {
    return variantCreate({
      name: formValues.name,
      productId: formValues.productId,
      price: formValues.price,
      materials: formValues.materials.map(({ materialId, amount, id }) => ({
        id,
        amount,
        materialId: materialId,
      })),
      description: formValues.description,
      values: formValues.values.map(({ id, optionValueId }) => ({
        id,
        optionValueId,
      })),
    }).then();
  };

  updateVariant: VariantRepository['updateVariant'] = (
    formValues,
    variantId
  ) => {
    return variantUpdateById(variantId, {
      name: formValues.name,
      productId: formValues.productId,
      price: formValues.price,
      materials: formValues.materials.map(({ materialId, amount, id }) => ({
        id,
        amount,
        materialId: materialId,
      })),
      description: formValues.description,
      values: formValues.values.map(({ id, optionValueId }) => ({
        id,
        optionValueId,
      })),
    }).then();
  };

  deleteVariantById: VariantRepository['deleteVariantById'] = (variantId) => {
    return variantDeleteById(variantId).then();
  };

  getVariantList: VariantRepository['getVariantList'] = ({
    itemPerPage,
    orderBy,
    page,
    query,
    sortBy,
    optionValueIds,
    productId,
  }) => {
    const params = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      optionValueIds,
      productId,
    };

    const res = this.client.getQueryState<VariantList200>(
      variantListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: variantListQueryKey(params) });

    return {
      variants: res?.data.map(variantTransformers.variant) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchVariantList = (
    params: {
      query: string;
      page: number;
      itemPerPage: number;
      orderBy: 'asc' | 'desc';
      sortBy: 'created_at';
      productId?: number;
      optionValueIds: number[];
    },
    options?: Partial<RequestConfig>
  ) => {
    const queryParams = {
      query: params.query,
      skip: (params.page - 1) * params.itemPerPage,
      limit: params.itemPerPage,
      order: params.orderBy,
      sortBy: params.sortBy,
      productId: params.productId,
      optionValueIds: params.optionValueIds,
    };

    return this.client
      .fetchQuery({
        queryKey: variantListQueryKey(queryParams),
        queryFn: () => variantList(queryParams, options),
      })
      .then((data) => ({
        variants: data.data.map(variantTransformers.variant),
        totalItem: data.meta.total,
      }));
  };
}
export const variantTransformers = {
  category: (category: ApiCategory): Category => ({
    id: category.id,
    name: category.name,
    createdAt: category.createdAt,
  }),
  variant: (variant: ApiVariant): Variant => ({
    id: variant.id,
    createdAt: variant.createdAt,
    name: variant.name,
    price: variant.price,
    materials: variant.materials.map<Variant['materials'][number]>(
      ({ amount, material, id }) => ({
        id,
        materialId: material.id,
        material: {
          id: material.id,
          name: material.name,
          description: material.description ?? '',
          price: material.price,
          unit: material.unit,
          createdAt: material.createdAt,
          weeklyUsage: material.weeklyUsage,
        },
        amount,
      })
    ),
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
  }),
};
