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
      .then(({ data }) => transformers.variant(data));
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
  }) => {
    const params = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
    };

    const res = this.client.getQueryState<VariantList200>(
      variantListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: variantListQueryKey(params) });

    return {
      type: res?.data ? 'loaded' : 'idle',
      page: 1,
      itemPerPage: 8,
      query: '',
      sortBy: 'created_at',
      orderBy: 'desc',
      errorMessage: null,
      variants: res?.data.map(transformers.variant) ?? [],
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
    },
    options?: Partial<RequestConfig>
  ) => {
    const queryParams = {
      query: params.query,
      skip: (params.page - 1) * params.itemPerPage,
      limit: params.itemPerPage,
      order: params.orderBy,
      sortBy: params.sortBy,
    };

    return this.client
      .fetchQuery({
        queryKey: variantListQueryKey(queryParams),
        queryFn: () => variantList(queryParams, options),
      })
      .then((data) => ({
        variants: data.data.map(transformers.variant),
        totalItem: data.meta.total,
      }));
  };
}
const transformers = {
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
          price: material.price,
          unit: material.unit,
          createdAt: material.createdAt,
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
