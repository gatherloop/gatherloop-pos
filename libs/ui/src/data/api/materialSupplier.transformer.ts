// eslint-disable-next-line @nx/enforce-module-boundaries
import { MaterialSupplierItem as ApiMaterialSupplierItem } from '../../../../api-contract/src';
import { MaterialSupplier, PurchaseType } from '../../domain';

export function toMaterialSupplier(item: ApiMaterialSupplierItem): MaterialSupplier {
  return {
    supplierId: item.supplierId,
    supplierName: item.supplierName,
    address: item.address,
    phone: item.phone,
    purchaseType: item.purchaseType as PurchaseType,
    purchaseUrl: item.purchaseUrl,
  };
}
