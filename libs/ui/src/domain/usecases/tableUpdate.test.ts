import {
  TableUpdateUsecase,
  TableUpdateState,
  TableUpdateAction,
  TableUpdateParams,
} from './tableUpdate';
import { MockTableRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TableUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockTableRepository();
      const usecase = new TableUpdateUsecase(repository, {
        tableId: 1,
        table: null,
      });
      const tester = new UsecaseTester<
        TableUpdateUsecase,
        TableUpdateState,
        TableUpdateAction,
        TableUpdateParams
      >(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { label: 'Meja 99', floorNumber: 1 } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTableRepository();
      repository.setShouldFail(true);
      const usecase = new TableUpdateUsecase(repository, {
        tableId: 1,
        table: null,
      });
      const tester = new UsecaseTester<
        TableUpdateUsecase,
        TableUpdateState,
        TableUpdateAction,
        TableUpdateParams
      >(usecase);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('error flow - submit error', () => {
    it('should transition loaded → submitting → submitError', async () => {
      const repository = new MockTableRepository();
      repository.setShouldFail(true);
      const usecase = new TableUpdateUsecase(repository, {
        tableId: 1,
        table: repository.tables[0],
      });
      const tester = new UsecaseTester<
        TableUpdateUsecase,
        TableUpdateState,
        TableUpdateAction,
        TableUpdateParams
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { label: 'Meja 99', floorNumber: 1 } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockTableRepository();
    const existing = repository.tables[0];
    const usecase = new TableUpdateUsecase(repository, {
      tableId: 1,
      table: existing,
    });
    const tester = new UsecaseTester<
      TableUpdateUsecase,
      TableUpdateState,
      TableUpdateAction,
      TableUpdateParams
    >(usecase);
    expect(tester.state.type).toBe('loaded');
    expect(tester.state.table).toEqual(existing);
  });

  it('should refetch the table (loaded → loading → loaded) when FETCH is dispatched, picking up a new code', async () => {
    const repository = new MockTableRepository();
    const existing = repository.tables[0];
    const usecase = new TableUpdateUsecase(repository, {
      tableId: existing.id,
      table: existing,
    });
    const tester = new UsecaseTester<
      TableUpdateUsecase,
      TableUpdateState,
      TableUpdateAction,
      TableUpdateParams
    >(usecase);

    expect(tester.state.type).toBe('loaded');

    await repository.regenerateTableCode(existing.id);
    tester.dispatch({ type: 'FETCH' });
    expect(tester.state.type).toBe('loading');

    await flushPromises();
    expect(tester.state.type).toBe('loaded');
    expect(tester.state.table?.code).not.toBe(existing.code);
  });
});
