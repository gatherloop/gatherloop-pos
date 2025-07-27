import { Variant, VariantForm } from '../entities';

export interface VariantRepository {
  getVariantList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => {
    variants: Variant[];
    totalItem: number;
  };

  fetchVariantList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => Promise<{ variants: Variant[]; totalItem: number }>;

  fetchVariantById: (variantId: number) => Promise<Variant>;

  deleteVariantById: (variantId: number) => Promise<void>;

  createVariant: (formValues: VariantForm) => Promise<void>;

  updateVariant: (formValues: VariantForm, variantId: number) => Promise<void>;
}
