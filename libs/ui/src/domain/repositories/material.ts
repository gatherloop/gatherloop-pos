import { Material, MaterialForm } from '../entities';

export type MaterialListParams = {
  page: number;
  itemPerPage: number;
  query: string;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
};

export interface MaterialRepository {
  getMaterialListServerParams: () => MaterialListParams;

  getMaterialByIdServerParams: () => number | null;

  getMaterialList: (params: MaterialListParams) => {
    materials: Material[];
    totalItem: number;
  };

  getMaterialById: (materialId: number) => Material | null;

  fetchMaterialList: (
    params: MaterialListParams
  ) => Promise<{ materials: Material[]; totalItem: number }>;

  fetchMaterialById: (materialId: number) => Promise<Material>;

  deleteMaterialById: (materialId: number) => Promise<void>;

  createMaterial: (formValues: MaterialForm) => Promise<void>;

  updateMaterial: (
    formValues: MaterialForm,
    materialId: number
  ) => Promise<void>;
}
