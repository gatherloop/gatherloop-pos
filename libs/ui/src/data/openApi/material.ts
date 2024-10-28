import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  materialCreate,
  materialDeleteById,
  materialFindById,
  MaterialFindById200,
  materialFindByIdQueryKey,
  materialList,
  MaterialList200,
  materialListQueryKey,
  materialUpdateById,
  Material as ApiMaterial,
} from '../../../../api-contract/src';
import { Material, MaterialListParams, MaterialRepository } from '../../domain';

export class OpenAPIMaterialRepository implements MaterialRepository {
  client: QueryClient;

  materialListServerParams: MaterialListParams = {
    page: 1,
    itemPerPage: 8,
    orderBy: 'desc',
    query: '',
    sortBy: 'created_at',
  };

  materialByIdServerParams: number | null = null;

  constructor(client: QueryClient) {
    this.client = client;
  }

  getMaterialById: MaterialRepository['getMaterialById'] = (materialId) => {
    const res = this.client.getQueryState<MaterialFindById200>(
      materialFindByIdQueryKey(materialId)
    )?.data;

    this.client.removeQueries({
      queryKey: materialFindByIdQueryKey(materialId),
    });

    return res ? transformers.material(res.data) : null;
  };

  getMaterialListServerParams: MaterialRepository['getMaterialListServerParams'] =
    () => this.materialListServerParams;

  getMaterialByIdServerParams: MaterialRepository['getMaterialByIdServerParams'] =
    () => this.materialByIdServerParams;

  fetchMaterialById: MaterialRepository['fetchMaterialById'] = (materialId) => {
    return this.client
      .fetchQuery({
        queryKey: materialFindByIdQueryKey(materialId),
        queryFn: () => materialFindById(materialId),
      })
      .then(({ data }) => transformers.material(data));
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
      materials: res?.data.map(transformers.material) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchMaterialList: MaterialRepository['fetchMaterialList'] = ({
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

    return this.client
      .fetchQuery({
        queryKey: materialListQueryKey(params),
        queryFn: () => materialList(params),
      })
      .then((data) => ({
        materials: data.data.map(transformers.material),
        totalItem: data.meta.total,
      }));
  };
}

const transformers = {
  material: (material: ApiMaterial): Material => ({
    id: material.id,
    createdAt: material.createdAt,
    name: material.name,
    price: material.price,
    unit: material.unit,
  }),
};
