import {
  ChecklistSessionDetailUsecase,
  ChecklistSessionDetailState,
  ChecklistSessionDetailAction,
  ChecklistSessionDetailParams,
} from './checklistSessionDetail';
import { MockChecklistSessionRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

type Tester = UsecaseTester<
  ChecklistSessionDetailUsecase,
  ChecklistSessionDetailState,
  ChecklistSessionDetailAction,
  ChecklistSessionDetailParams
>;

function makeTester(
  repository: MockChecklistSessionRepository,
  checklistSession = repository.sessions[0]
): Tester {
  const params: ChecklistSessionDetailParams = {
    checklistSessionId: 1,
    checklistSession,
  };
  return new UsecaseTester(new ChecklistSessionDetailUsecase(repository, params));
}

function makeIdleTester(repository: MockChecklistSessionRepository): Tester {
  const params: ChecklistSessionDetailParams = {
    checklistSessionId: 1,
    checklistSession: null,
  };
  return new UsecaseTester(new ChecklistSessionDetailUsecase(repository, params));
}

describe('ChecklistSessionDetailUsecase', () => {
  describe('initial state with preloaded session', () => {
    it('should start in loaded state when session is provided', () => {
      const repository = new MockChecklistSessionRepository();
      const tester = makeTester(repository);

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistSession?.id).toBe(1);
    });
  });

  describe('initial state without preloaded session', () => {
    it('should start in idle state and auto-fetch', async () => {
      const repository = new MockChecklistSessionRepository();
      const tester = makeIdleTester(repository);

      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistSession?.id).toBe(1);
    });
  });

  describe('error flow', () => {
    it('should transition to error state on fetch failure', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const tester = makeIdleTester(repository);

      await flushPromises();
      expect(tester.state.type).toBe('error');
    });

    it('should retry fetch from error state', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const tester = makeIdleTester(repository);

      await flushPromises();
      expect(tester.state.type).toBe('error');

      repository.setShouldFail(false);
      tester.dispatch({ type: 'FETCH' });
      await flushPromises();
      expect(tester.state.type).toBe('loaded');
    });
  });

  describe('check item flow', () => {
    it('should toggle item and end in loaded state with updated data', async () => {
      const repository = new MockChecklistSessionRepository();
      const tester = makeTester(repository);

      // item 2 has no sub-items, so checking it is straightforward
      tester.dispatch({ type: 'CHECK_ITEM', itemId: 2 });
      expect(tester.state.type).toBe('checkingItem');
      if (tester.state.type === 'checkingItem') {
        expect(tester.state.itemId).toBe(2);
      }
      // Session data is still available (no blink)
      expect(tester.state.checklistSession).not.toBeNull();

      // Both toggle and revalidation resolve within one microtask batch
      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      const item = repository.sessions[0].items.find((i) => i.id === 2);
      expect(item?.completedAt).toBeDefined();
    });
  });

  describe('uncheck item flow', () => {
    it('should untoggle item and end in loaded state with updated data', async () => {
      const repository = new MockChecklistSessionRepository();
      // Pre-check item 2
      repository.sessions[0].items[1].completedAt = '2024-03-20T10:00:00.000Z';
      const tester = makeTester(repository);

      tester.dispatch({ type: 'UNCHECK_ITEM', itemId: 2 });
      expect(tester.state.type).toBe('uncheckingItem');
      expect(tester.state.checklistSession).not.toBeNull();

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      const item = repository.sessions[0].items.find((i) => i.id === 2);
      expect(item?.completedAt).toBeNull();
    });
  });

  describe('check sub-item flow', () => {
    it('should toggle sub-item and end in loaded state with updated data', async () => {
      const repository = new MockChecklistSessionRepository();
      const tester = makeTester(repository);

      tester.dispatch({ type: 'CHECK_SUB_ITEM', subItemId: 1 });
      expect(tester.state.type).toBe('checkingSubItem');
      if (tester.state.type === 'checkingSubItem') {
        expect(tester.state.subItemId).toBe(1);
      }
      // Session data is still available (no blink)
      expect(tester.state.checklistSession).not.toBeNull();

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      const subItem = repository.sessions[0].items[0].subItems.find(
        (s) => s.id === 1
      );
      expect(subItem?.completedAt).toBeDefined();
    });
  });

  describe('uncheck sub-item flow', () => {
    it('should untoggle sub-item and end in loaded state with updated data', async () => {
      const repository = new MockChecklistSessionRepository();
      // Pre-check sub-item 1
      repository.sessions[0].items[0].subItems[0].completedAt =
        '2024-03-20T10:00:00.000Z';
      const tester = makeTester(repository);

      tester.dispatch({ type: 'UNCHECK_SUB_ITEM', subItemId: 1 });
      expect(tester.state.type).toBe('uncheckingSubItem');
      expect(tester.state.checklistSession).not.toBeNull();

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      const subItem = repository.sessions[0].items[0].subItems.find(
        (s) => s.id === 1
      );
      expect(subItem?.completedAt).toBeNull();
    });
  });

  describe('toggle error flow', () => {
    it('should revert to loaded with session preserved on item check error', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const tester = makeTester(repository);

      tester.dispatch({ type: 'CHECK_ITEM', itemId: 2 });
      await flushPromises();

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistSession).not.toBeNull();
      expect(tester.state.errorMessage).not.toBeNull();
    });

    it('should revert to loaded with session preserved on sub-item check error', async () => {
      const repository = new MockChecklistSessionRepository();
      repository.setShouldFail(true);
      const tester = makeTester(repository);

      tester.dispatch({ type: 'CHECK_SUB_ITEM', subItemId: 1 });
      await flushPromises();

      expect(tester.state.type).toBe('loaded');
      expect(tester.state.checklistSession).not.toBeNull();
      expect(tester.state.errorMessage).not.toBeNull();
    });
  });

  describe('revalidation error transition', () => {
    it('should stay loaded with existing session when REVALIDATE_ERROR is dispatched', () => {
      const repository = new MockChecklistSessionRepository();
      const usecase = new ChecklistSessionDetailUsecase(repository, {
        checklistSessionId: 1,
        checklistSession: repository.sessions[0],
      });

      const revalidatingState: ChecklistSessionDetailState = {
        type: 'revalidating',
        checklistSession: repository.sessions[0],
        errorMessage: null,
      };

      const nextState = usecase.getNextState(revalidatingState, {
        type: 'REVALIDATE_ERROR',
      });

      expect(nextState.type).toBe('loaded');
      expect(nextState.checklistSession).toBe(repository.sessions[0]);
      expect(nextState.errorMessage).toBeNull();
    });
  });

  describe('ignores actions in non-actionable states', () => {
    it('should ignore CHECK_ITEM when state is loading', async () => {
      const repository = new MockChecklistSessionRepository();
      const tester = makeIdleTester(repository);

      // State is loading (auto-fetching from idle)
      expect(tester.state.type).toBe('loading');

      tester.dispatch({ type: 'CHECK_ITEM', itemId: 2 });
      expect(tester.state.type).toBe('loading');
    });
  });
});
