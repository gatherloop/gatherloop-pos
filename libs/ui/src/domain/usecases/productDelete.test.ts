import {
  ProductDeleteUsecase,
  ProductDeleteState,
  ProductDeleteAction,
} from './productDelete';
import { MockProductRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('ProductDeleteUsecase', () => {
  describe('success flow', () => {
    const repository = new MockProductRepository();
    const usecase = new ProductDeleteUsecase(repository);
    let tester: UsecaseTester<ProductDeleteUsecase, ProductDeleteState, ProductDeleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state).toEqual({ type: 'hidden', productId: null });
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
      expect(tester.state).toEqual({ type: 'shown', productId: 1 });
    });

    it('transitions to deleting when DELETE is dispatched', () => {
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');
    });

    it('auto-transitions to hidden after successful delete', async () => {
      await Promise.resolve();
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
    const repository = new MockProductRepository();
    repository.setShouldFail(true);
    const usecase = new ProductDeleteUsecase(repository);
    let tester: UsecaseTester<ProductDeleteUsecase, ProductDeleteState, ProductDeleteAction, undefined>;

    it('initializes in hidden state', () => {
      tester = new UsecaseTester(usecase);
      expect(tester.state.type).toBe('hidden');
    });

    it('transitions to shown when SHOW_CONFIRMATION is dispatched', () => {
      tester.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
      expect(tester.state.type).toBe('shown');
    });

    it('transitions to deleting when DELETE is dispatched', () => {
      tester.dispatch({ type: 'DELETE' });
      expect(tester.state.type).toBe('deleting');
    });

    it('auto-recovers to shown state after delete error', async () => {
      await Promise.resolve();
      // deleting -> deletingError -> onStateChange(deletingError) -> DELETE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
