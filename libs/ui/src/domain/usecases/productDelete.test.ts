import {
  ProductDeleteUsecase,
  ProductDeleteState,
  ProductDeleteAction,
} from './productDelete';
import { MockProductRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ProductDeleteUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → deleting → hidden', async () => {
      const repository = new MockProductRepository();
      const usecase = new ProductDeleteUsecase(repository);
      const tester = new UsecaseTester<ProductDeleteUsecase, ProductDeleteState, ProductDeleteAction, undefined>(usecase);

      expect(tester.state).toEqual({ type: 'hidden', productId: null });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
      expect(tester.state).toEqual({ type: 'shown', productId: 1 });

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deletingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockProductRepository();
    const usecase = new ProductDeleteUsecase(repository);
    const tester = new UsecaseTester<ProductDeleteUsecase, ProductDeleteState, ProductDeleteAction, undefined>(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → deleting → shown (auto-recover)', async () => {
      const repository = new MockProductRepository();
      repository.setShouldFail(true);
      const usecase = new ProductDeleteUsecase(repository);
      const tester = new UsecaseTester<ProductDeleteUsecase, ProductDeleteState, ProductDeleteAction, undefined>(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');

      await flushPromises();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
