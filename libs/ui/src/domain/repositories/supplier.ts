import { Supplier, SupplierForm } from '../entities';

export interface SupplierRepository {
  getSupplierList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => {
    suppliers: Supplier[];
    totalItem: number;
  };

  fetchSupplierList: (params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => Promise<{ suppliers: Supplier[]; totalItem: number }>;

  fetchSupplierById: (supplierId: number) => Promise<Supplier>;

  deleteSupplierById: (supplierId: number) => Promise<void>;

  createSupplier: (formValues: SupplierForm) => Promise<void>;

  updateSupplier: (
    formValues: SupplierForm,
    supplierId: number
  ) => Promise<void>;
}
