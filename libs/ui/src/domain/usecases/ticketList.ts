import { match, P } from 'ts-pattern';
import { Ticket } from '../entities';
import { TicketRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  tickets: Ticket[];
  errorMessage: string | null;
};

export type TicketListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type TicketListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; tickets: Ticket[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE'; tickets: Ticket[] }
  | { type: 'REVALIDATE_FINISH'; tickets: Ticket[] };

export type TicketListParams = {
  tickets: Ticket[];
};

export class TicketListUsecase extends Usecase<
  TicketListState,
  TicketListAction,
  TicketListParams
> {
  params: TicketListParams;
  repository: TicketRepository;

  constructor(repository: TicketRepository, params: TicketListParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState() {
    const state: TicketListState = {
      type: this.params.tickets.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      tickets: this.params.tickets,
    };
    return state;
  }

  getNextState(state: TicketListState, action: TicketListAction) {
    return match([state, action])
      .returnType<TicketListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { tickets }]) => ({
          ...state,
          type: 'loaded',
          tickets,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
        errorMessage: null,
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { tickets }]) => ({
          ...state,
          type: 'loaded',
          tickets,
          errorMessage: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TicketListState,
    dispatch: (action: TicketListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchTicketList()
          .then((tickets) => dispatch({ type: 'FETCH_SUCCESS', tickets }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch tickets',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ tickets }) => {
        this.repository
          .fetchTicketList()
          .then((tickets) => dispatch({ type: 'REVALIDATE_FINISH', tickets }))
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', tickets }));
      })
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
