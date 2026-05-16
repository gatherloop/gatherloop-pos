// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material as ApiMaterial } from '../../../../api-contract/src';
import { Material, MaterialForm } from '../../domain';

import { toSupplier } from './supplier.transformer';

export function toMaterial(material: ApiMaterial): Material {
  return {
    id: material.id,
    createdAt: material.createdAt,
    name: material.name,
    price: material.price,
    unit: material.unit,
    description: material.description ?? '',
    weeklyUsage: material.weeklyUsage,
    purchaseUnit: material.purchaseUnit,
    purchaseUnitSize: material.purchaseUnitSize,
    minimumStock: material.minimumStock,
    normalStock: material.normalStock,
    suppliers: (material.suppliers ?? []).map(toSupplier),
  };
}

export function toApiMaterial(form: MaterialForm) {
  return {
    name: form.name,
    price: form.price,
    unit: form.unit,
    description: form.description,
    purchaseUnit: form.purchaseUnit,
    purchaseUnitSize: form.purchaseUnitSize,
    minimumStock: form.minimumStock,
    normalStock: form.normalStock,
    supplierIds: form.supplierIds ?? [],
  };
}
