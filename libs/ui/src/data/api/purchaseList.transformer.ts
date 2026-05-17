// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  PurchaseList as ApiPurchaseList,
  PurchaseListItem as ApiPurchaseListItem,
} from '../../../../api-contract/src';
import { PurchaseList, PurchaseListItem } from '../../domain';
import { toMaterialSupplier } from './materialSupplier.transformer';

export function toPurchaseListItem(item: ApiPurchaseListItem): PurchaseListItem {
  return {
    materialId: item.materialId,
    materialName: item.materialName,
    currentStock: item.currentStock,
    minimumStock: item.minimumStock,
    normalStock: item.normalStock,
    purchaseUnit: item.purchaseUnit,
    purchaseUnitSize: item.purchaseUnitSize,
    purchaseQuantity: item.purchaseQuantity,
    estimatedCost: item.estimatedCost,
    materialSuppliers: (item.materialSuppliers ?? []).map(toMaterialSupplier),
  };
}

export function toPurchaseList(purchaseList: ApiPurchaseList): PurchaseList {
  return {
    stockCheckId: purchaseList.stockCheckId,
    stockCheckDate: purchaseList.stockCheckDate,
    totalEstimatedCost: purchaseList.totalEstimatedCost,
    items: purchaseList.items.map(toPurchaseListItem),
  };
}
