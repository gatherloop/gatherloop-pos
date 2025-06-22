import { Material, MaterialForm } from '../entities';

export interface MaterialRepository {
  getMaterialList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => {
    materials: Material[];
    totalItem: number;
  };

  fetchMaterialList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => Promise<{ materials: Material[]; totalItem: number }>;

  fetchMaterialById: (materialId: number) => Promise<Material>;

  deleteMaterialById: (materialId: number) => Promise<void>;

  createMaterial: (formValues: MaterialForm) => Promise<void>;

  updateMaterial: (
    formValues: MaterialForm,
    materialId: number
  ) => Promise<void>;
}
