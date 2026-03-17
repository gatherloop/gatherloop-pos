import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  materialCreate,
  materialDeleteById,
  materialFindById,
  materialFindByIdQueryKey,
  materialList,
  MaterialList200,
  materialListQueryKey,
  materialUpdateById,
  Material as ApiMaterial,
} from '../../../../api-contract/src';
import { Material, MaterialRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';

export class ApiMaterialRepository implements MaterialRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  fetchMaterialById = (
    materialId: number,
    options?: Partial<RequestConfig>
  ) => {
    return this.client
      .fetchQuery({
        queryKey: materialFindByIdQueryKey(materialId),
        queryFn: () => materialFindById(materialId, options),
      })
      .then(({ data }) => materialTransformers.material(data));
  };

  createMaterial: MaterialRepository['createMaterial'] = (formValues) => {
    return materialCreate(formValues).then();
  };

  updateMaterial: MaterialRepository['updateMaterial'] = (
    formValues,
    materialId
  ) => {
    return materialUpdateById(materialId, formValues).then();
  };

  deleteMaterialById: MaterialRepository['deleteMaterialById'] = (
    materialId
  ) => {
    return materialDeleteById(materialId).then();
  };

  getMaterialList: MaterialRepository['getMaterialList'] = ({
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

    const res = this.client.getQueryState<MaterialList200>(
      materialListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: materialListQueryKey(params) });

    return {
      materials: res?.data.map(materialTransformers.material) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchMaterialList = (
    {
      itemPerPage,
      orderBy,
      page,
      query,
      sortBy,
    }: {
      page: number;
      itemPerPage: number;
      query: string;
      sortBy: 'created_at';
      orderBy: 'asc' | 'desc';
    },
    options?: Partial<RequestConfig>
  ) => {
    const params = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
    };

    return this.client
      .fetchQuery({
        queryKey: materialListQueryKey(params),
        queryFn: () => materialList(params, options),
      })
      .then((data) => ({
        materials: data.data.map(materialTransformers.material),
        totalItem: data.meta.total,
      }));
  };
}

export const materialTransformers = {
  material: (material: ApiMaterial): Material => ({
    id: material.id,
    createdAt: material.createdAt,
    name: material.name,
    price: material.price,
    unit: material.unit,
    description: material.description ?? '',
    weeklyUsage: material.weeklyUsage,
  }),
};
