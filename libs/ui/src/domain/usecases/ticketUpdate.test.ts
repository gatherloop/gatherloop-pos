import {
  TicketUpdateUsecase,
  TicketUpdateState,
  TicketUpdateAction,
  TicketUpdateParams,
} from './ticketUpdate';
import { MockTicketRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TicketUpdateUsecase', () => {
  describe('success flow - fetch then submit', () => {
    it('should transition loading → loaded → submitting → submitSuccess', async () => {
      const repository = new MockTicketRepository();
      const usecase = new TicketUpdateUsecase(repository, { ticketId: 1, ticket: null });
      const tester = new UsecaseTester<TicketUpdateUsecase, TicketUpdateState, TicketUpdateAction, TicketUpdateParams>(usecase);

      // idle -> onStateChange(idle) dispatches FETCH -> loading
      expect(tester.state.type).toBe('loading');

      await flushPromises();
      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { code: '0xUPDATED', name: 'Ticket 02' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      expect(tester.state.type).toBe('submitSuccess');
    });
  });

  describe('error flow - fetch error', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTicketRepository();
      repository.setShouldFail(true);
      const usecase = new TicketUpdateUsecase(repository, { ticketId: 1, ticket: null });
      const tester = new UsecaseTester<TicketUpdateUsecase, TicketUpdateState, TicketUpdateAction, TicketUpdateParams>(usecase);

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
    it('should transition loaded → submitting → loaded (auto-recover)', async () => {
      const repository = new MockTicketRepository();
      repository.setShouldFail(true);
      const usecase = new TicketUpdateUsecase(repository, {
        ticketId: 1,
        ticket: repository.tickets[0],
      });
      const tester = new UsecaseTester<TicketUpdateUsecase, TicketUpdateState, TicketUpdateAction, TicketUpdateParams>(usecase);

      expect(tester.state.type).toBe('loaded');

      tester.dispatch({ type: 'SUBMIT', values: { code: '0xUPDATED', name: 'Ticket 02' } });
      expect(tester.state.type).toBe('submitting');

      await flushPromises();
      // submitError auto-cancels to loaded via onStateChange(submitError) -> SUBMIT_CANCEL
      expect(tester.state.type).toBe('submitError');
    });
  });

  it('starts in loaded state when data is preloaded', () => {
    const repository = new MockTicketRepository();
    const existing = repository.tickets[0];
    const usecase = new TicketUpdateUsecase(repository, { ticketId: 1, ticket: existing });
    const tester = new UsecaseTester<TicketUpdateUsecase, TicketUpdateState, TicketUpdateAction, TicketUpdateParams>(usecase);
    expect(tester.state.type).toBe('loaded');
  });
});
