import { StockCheck, StockCheckRepository } from '../../domain';

export class MockStockCheckRepository implements StockCheckRepository {
  public shouldFail: boolean;
  public stockChecks: StockCheck[];

  constructor() {
    this.shouldFail = false;
    this.stockChecks = [
      {
        id: 1,
        createdAt: '2024-03-20T00:00:00.000Z',
        items: [
          {
            id: 1,
            stockCheckId: 1,
            materialId: 1,
            currentStock: 3,
            materialName: 'Tepung',
            price: 15,
            purchaseUnit: 'Kg',
            purchaseUnitSize: 1000,
            minimumStock: 1,
            normalStock: 5,
            createdAt: '2024-03-20T00:00:00.000Z',
          },
        ],
      },
    ];
  }

  getStockCheckList: StockCheckRepository['getStockCheckList'] = () => {
    return {
      stockChecks: this.stockChecks,
      totalItem: this.stockChecks.length,
    };
  };

  fetchStockCheckList: StockCheckRepository['fetchStockCheckList'] = () => {
    return this.shouldFail
      ? Promise.reject(new Error('Failed'))
      : Promise.resolve({
          stockChecks: this.stockChecks,
          totalItem: this.stockChecks.length,
        });
  };

  fetchStockCheckById: StockCheckRepository['fetchStockCheckById'] = (id) => {
    const stockCheck = this.stockChecks.find((s) => s.id === id);
    return this.shouldFail || !stockCheck
      ? Promise.reject(new Error('Not found'))
      : Promise.resolve(stockCheck);
  };

  createStockCheck: StockCheckRepository['createStockCheck'] = () => {
    return this.shouldFail
      ? Promise.reject(new Error('Failed'))
      : Promise.resolve();
  };

  updateStockCheck: StockCheckRepository['updateStockCheck'] = () => {
    return this.shouldFail
      ? Promise.reject(new Error('Failed'))
      : Promise.resolve();
  };

  deleteStockCheckById: StockCheckRepository['deleteStockCheckById'] = () => {
    return this.shouldFail
      ? Promise.reject(new Error('Failed'))
      : Promise.resolve();
  };
}
