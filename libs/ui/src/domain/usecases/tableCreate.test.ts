import {
  TableCreateUsecase,
  TableCreateState,
  TableCreateAction,
} from './tableCreate';
import { MockTableRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TableCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockTableRepository();
      const usecase = new TableCreateUsecase(repository);
      const tester = new UsecaseTester<
        TableCreateUsecase,
        TableCreateState,
        TableCreateAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { label: 'Meja 01', floorNumber: 1 } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → submitError', async () => {
      const repository = new MockTableRepository();
      repository.setShouldFail(true);
      const usecase = new TableCreateUsecase(repository);
      const tester = new UsecaseTester<
        TableCreateUsecase,
        TableCreateState,
        TableCreateAction,
        undefined
      >(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { label: 'Meja 01', floorNumber: 1 } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitError');
    });
  });
});
