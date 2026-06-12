import {
  TicketListUsecase,
  TicketListAction,
  TicketListState,
  TicketListParams,
} from './ticketList';
import { MockTicketRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TicketListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded', async () => {
      const repository = new MockTicketRepository();
      const usecase = new TicketListUsecase(repository, { tickets: [] });
      const ticketList = new UsecaseTester<
        TicketListUsecase,
        TicketListState,
        TicketListAction,
        TicketListParams
      >(usecase);

      expect(ticketList.state).toEqual({
        type: 'loading',
        tickets: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(ticketList.state).toEqual({
        type: 'loaded',
        tickets: repository.tickets,
        errorMessage: null,
      });

      ticketList.dispatch({ type: 'FETCH' });
      expect(ticketList.state).toEqual({
        type: 'revalidating',
        tickets: repository.tickets,
        errorMessage: null,
      });

      await flushPromises();
      expect(ticketList.state).toEqual({
        type: 'loaded',
        tickets: repository.tickets,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTicketRepository();
      repository.setShouldFail(true);
      const usecase = new TicketListUsecase(repository, { tickets: [] });
      const ticketList = new UsecaseTester<
        TicketListUsecase,
        TicketListState,
        TicketListAction,
        TicketListParams
      >(usecase);

      expect(ticketList.state).toEqual({
        type: 'loading',
        tickets: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(ticketList.state).toEqual({
        type: 'error',
        tickets: [],
        errorMessage: 'Failed to fetch tickets',
      });

      repository.setShouldFail(false);
      ticketList.dispatch({ type: 'FETCH' });
      expect(ticketList.state).toEqual({
        type: 'loading',
        tickets: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(ticketList.state).toEqual({
        type: 'loaded',
        tickets: repository.tickets,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockTicketRepository();

    const tickets = [repository.tickets[0]];

    const usecase = new TicketListUsecase(repository, { tickets });

    const ticketList = new UsecaseTester<
      TicketListUsecase,
      TicketListState,
      TicketListAction,
      TicketListParams
    >(usecase);

    expect(ticketList.state).toEqual({
      type: 'loaded',
      tickets,
      errorMessage: null,
    });
  });
});
