// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  StockCheck as ApiStockCheck,
  StockCheckItem as ApiStockCheckItem,
} from '../../../../api-contract/src';
import { StockCheck, StockCheckForm, StockCheckItem } from '../../domain';

export function toStockCheckItem(item: ApiStockCheckItem): StockCheckItem {
  return {
    id: item.id,
    stockCheckId: item.stockCheckId,
    materialId: item.materialId,
    currentStock: item.currentStock,
    materialName: item.materialName,
    price: item.price,
    purchaseUnit: item.purchaseUnit,
    purchaseUnitSize: item.purchaseUnitSize,
    minimumStock: item.minimumStock,
    normalStock: item.normalStock,
    createdAt: item.createdAt,
  };
}

export function toStockCheck(stockCheck: ApiStockCheck): StockCheck {
  return {
    id: stockCheck.id,
    createdAt: stockCheck.createdAt,
    items: stockCheck.items.map(toStockCheckItem),
  };
}

export function toApiStockCheckForm(form: StockCheckForm) {
  return {
    items: form.items.map((item) => ({
      materialId: item.materialId,
      // zod validation guarantees a number by submission time; fall back to 0 to satisfy the API type.
      currentStock: item.currentStock ?? 0,
    })),
  };
}
