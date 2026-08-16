import {
  TableRegenerateCodeUsecase,
  TableRegenerateCodeState,
  TableRegenerateCodeAction,
} from './tableRegenerateCode';
import { MockTableRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TableRegenerateCodeUsecase', () => {
  describe('success flow', () => {
    it('should transition hidden → shown → regenerating → hidden with a new code', async () => {
      const repository = new MockTableRepository();
      const existing = repository.tables[0];
      const usecase = new TableRegenerateCodeUsecase(repository);
      const tester = new UsecaseTester<
        TableRegenerateCodeUsecase,
        TableRegenerateCodeState,
        TableRegenerateCodeAction,
        undefined
      >(usecase);

      expect(tester.state).toEqual({
        type: 'hidden',
        tableId: null,
        table: null,
      });

      tester.dispatch({ type: 'SHOW_CONFIRMATION', tableId: existing.id });
      expect(tester.state).toEqual({
        type: 'shown',
        tableId: existing.id,
        table: null,
      });

      tester.dispatch({ type: 'REGENERATE' });
      expect(tester.state.type).toBe('regenerating');

      await flushPromises();
      // regeneratingSuccess -> onStateChange dispatches HIDE_CONFIRMATION -> hidden
      expect(tester.state.type).toBe('hidden');
    });
  });

  it('transitions to hidden when HIDE_CONFIRMATION is dispatched from shown', () => {
    const repository = new MockTableRepository();
    const usecase = new TableRegenerateCodeUsecase(repository);
    const tester = new UsecaseTester<
      TableRegenerateCodeUsecase,
      TableRegenerateCodeState,
      TableRegenerateCodeAction,
      undefined
    >(usecase);
    tester.dispatch({ type: 'SHOW_CONFIRMATION', tableId: 1 });
    tester.dispatch({ type: 'HIDE_CONFIRMATION' });
    expect(tester.state.type).toBe('hidden');
  });

  describe('error flow', () => {
    it('should transition hidden → shown → regenerating → shown (auto-recover)', async () => {
      const repository = new MockTableRepository();
      repository.setShouldFail(true);
      const usecase = new TableRegenerateCodeUsecase(repository);
      const tester = new UsecaseTester<
        TableRegenerateCodeUsecase,
        TableRegenerateCodeState,
        TableRegenerateCodeAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('hidden');

      tester.dispatch({ type: 'SHOW_CONFIRMATION', tableId: 1 });
      expect(tester.state.type).toBe('shown');

      tester.dispatch({ type: 'REGENERATE' });
      expect(tester.state.type).toBe('regenerating');

      await flushPromises();
      // regenerating -> regeneratingError -> onStateChange(regeneratingError) -> REGENERATE_CANCEL -> shown
      expect(tester.state.type).toBe('shown');
    });
  });
});
