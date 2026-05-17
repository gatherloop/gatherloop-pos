import { Supplier, SupplierForm } from '../../domain/entities';
import { SupplierRepository } from '../../domain/repositories/supplier';

const initialSuppliers: Supplier[] = [
  {
    id: 1,
    name: 'Supplier 1',
    phone: '081234567890',
    address: 'Jl. Supplier 1 No. 1',
    mapsLink: 'https://maps.google.com/?q=supplier1',
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Supplier 2',
    phone: '082345678901',
    address: 'Jl. Supplier 2 No. 2',
    mapsLink: 'https://maps.google.com/?q=supplier2',
    createdAt: '2024-03-21T00:00:00.000Z',
  },
];

export class MockSupplierRepository implements SupplierRepository {
  suppliers: Supplier[] = [...initialSuppliers];

  private nextId = 3;
  private shouldFail = false;

  setShouldFail(value: boolean) {
    this.shouldFail = value;
  }

  getSupplierList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }): { suppliers: Supplier[]; totalItem: number } {
    return {
      suppliers: [...this.suppliers],
      totalItem: this.suppliers.length,
    };
  }

  async fetchSupplierList(_params: {
    page: number;
    itemPerPage: number;
    query: string;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }): Promise<{ suppliers: Supplier[]; totalItem: number }> {
    if (this.shouldFail) throw new Error('Failed to fetch suppliers');
    return Promise.resolve({
      suppliers: [...this.suppliers],
      totalItem: this.suppliers.length,
    });
  }

  async fetchSupplierById(supplierId: number): Promise<Supplier> {
    if (this.shouldFail) throw new Error('Failed to fetch supplier');
    const supplier = this.suppliers.find((s) => s.id === supplierId);
    if (!supplier) throw new Error('Supplier not found');
    return { ...supplier };
  }

  async deleteSupplierById(supplierId: number): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to delete supplier');
    this.suppliers = this.suppliers.filter((s) => s.id !== supplierId);
  }

  async createSupplier(formValues: SupplierForm): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to create supplier');
    this.suppliers.push({
      id: this.nextId++,
      name: formValues.name,
      phone: formValues.phone,
      address: formValues.address,
      mapsLink: formValues.mapsLink,
      createdAt: new Date().toISOString(),
    });
  }

  async updateSupplier(
    formValues: SupplierForm,
    supplierId: number
  ): Promise<void> {
    if (this.shouldFail) throw new Error('Failed to update supplier');
    const idx = this.suppliers.findIndex((s) => s.id === supplierId);
    if (idx === -1) throw new Error('Supplier not found');
    this.suppliers[idx] = {
      ...this.suppliers[idx],
      name: formValues.name,
      phone: formValues.phone,
      address: formValues.address,
      mapsLink: formValues.mapsLink,
    };
  }

  reset() {
    this.suppliers = [...initialSuppliers];
    this.nextId = 3;
    this.shouldFail = false;
  }
}
