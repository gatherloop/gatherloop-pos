// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material as ApiMaterial } from '../../../../api-contract/src';
import { Material, MaterialForm } from '../../domain';
import { toMaterialSupplier } from './materialSupplier.transformer';

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
    materialSuppliers: (material.materialSuppliers ?? []).map(toMaterialSupplier),
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
    materialSuppliers: (form.materialSuppliers ?? []).map((ms) => ({
      supplierId: ms.supplierId,
      purchaseType: ms.purchaseType,
      purchaseUrl: ms.purchaseUrl,
    })),
  };
}
