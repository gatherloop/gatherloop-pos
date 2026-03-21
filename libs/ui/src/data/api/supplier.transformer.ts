// eslint-disable-next-line @nx/enforce-module-boundaries
import { Supplier as ApiSupplier } from '../../../../api-contract/src';
import { Supplier, SupplierForm } from '../../domain';

export function toSupplier(supplier: ApiSupplier): Supplier {
  return {
    id: supplier.id,
    createdAt: supplier.createdAt,
    name: supplier.name,
    address: supplier.address,
    mapsLink: supplier.mapsLink,
    phone: supplier.phone ?? '',
  };
}

export function toApiSupplier(form: SupplierForm) {
  return {
    name: form.name,
    phone: form.phone,
    address: form.address,
    mapsLink: form.mapsLink,
  };
}
