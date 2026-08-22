import {
  StockCheckUpdateUsecase,
  StockCheckUpdateState,
  StockCheckUpdateAction,
  StockCheckUpdateParams,
} from './stockCheckUpdate';
import { MockStockCheckRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('StockCheckUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockStockCheckRepository();
      const usecase = new StockCheckUpdateUsecase(repository, {
        stockCheckId: 1,
        stockCheck: null,
      });
      const tester = new UsecaseTester<
        StockCheckUpdateUsecase,
        StockCheckUpdateState,
        StockCheckUpdateAction,
        StockCheckUpdateParams
      >(usecase);

      // idle -> onStateChange(idle) synchronously dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');
      expect(tester.state.values.items).toEqual([]);

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.values.items).toEqual([
        {
          materialId: 1,
          materialName: 'Tepung',
          purchaseUnit: 'Kg',
          currentStock: 3,
        },
      ]);

      tester.dispatch({
        type: 'SUBMIT',
        values: { items: tester.state.values.items },
      });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error', async () => {
      const repository = new MockStockCheckRepository();
      repository.shouldFail = true;
      const usecase = new StockCheckUpdateUsecase(repository, {
        stockCheckId: 1,
        stockCheck: null,
      });
      const tester = new UsecaseTester<
        StockCheckUpdateUsecase,
        StockCheckUpdateState,
        StockCheckUpdateAction,
        StockCheckUpdateParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockStockCheckRepository();
    const existing = repository.stockChecks[0];
    const usecase = new StockCheckUpdateUsecase(repository, {
      stockCheckId: 1,
      stockCheck: existing,
    });
    const tester = new UsecaseTester<
      StockCheckUpdateUsecase,
      StockCheckUpdateState,
      StockCheckUpdateAction,
      StockCheckUpdateParams
    >(usecase);
    expect(tester.state.type).toBe('loaded');
    expect(tester.state.values.items).toEqual([
      {
        materialId: 1,
        materialName: 'Tepung',
        purchaseUnit: 'Kg',
        currentStock: 3,
      },
    ]);
  });
});
