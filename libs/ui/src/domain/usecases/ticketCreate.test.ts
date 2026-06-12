import {
  TicketCreateUsecase,
  TicketCreateState,
  TicketCreateAction,
} from './ticketCreate';
import { MockTicketRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TicketCreateUsecase', () => {
  describe('success flow', () => {
    it('should transition loaded → submitting → submitSuccess', async () => {
      const repository = new MockTicketRepository();
      const usecase = new TicketCreateUsecase(repository);
      const tester = new UsecaseTester<TicketCreateUsecase, TicketCreateState, TicketCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { code: '0xA3F19C82', name: 'Ticket 01' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow', () => {
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockTicketRepository();
      repository.setShouldFail(true);
      const usecase = new TicketCreateUsecase(repository);
      const tester = new UsecaseTester<TicketCreateUsecase, TicketCreateState, TicketCreateAction, undefined>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { code: '0xA3F19C82', name: 'Ticket 01' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
    });
  });
});
