import { PurchaseList, PurchaseListRepository } from '../../domain';

export class MockPurchaseListRepository implements PurchaseListRepository {
  public shouldFail: boolean;
  public purchaseList: PurchaseList;

  constructor() {
    this.shouldFail = false;
    this.purchaseList = {
      stockCheckId: 1,
      stockCheckDate: '2024-03-20',
      totalEstimatedCost: 75000,
      items: [
        {
          materialId: 1,
          materialName: 'Tepung',
          currentStock: 0,
          minimumStock: 1,
          normalStock: 5,
          purchaseUnit: 'Kg',
          purchaseUnitSize: 1000,
          purchaseQuantity: 5,
          estimatedCost: 75000,
          materialSuppliers: [],
        },
      ],
    };
  }

  fetchPurchaseList: PurchaseListRepository['fetchPurchaseList'] = () => {
    return this.shouldFail
      ? Promise.reject(new Error('Failed'))
      : Promise.resolve(this.purchaseList);
  };
}
