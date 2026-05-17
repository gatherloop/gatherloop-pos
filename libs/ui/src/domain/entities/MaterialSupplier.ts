export type PurchaseType = 'offline' | 'online' | 'delivery';

export type MaterialSupplier = {
  supplierId: number;
  supplierName: string;
  address: string;
  phone: string;
  purchaseType: PurchaseType;
  purchaseUrl: string;
};

export type MaterialSupplierInput = {
  supplierId: number;
  purchaseType: PurchaseType;
  purchaseUrl: string;
};
