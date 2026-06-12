import { match } from 'ts-pattern';
import { Ticket, TicketForm } from '../entities';
import { TicketRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: TicketForm;
};

export type TicketUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type TicketUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: TicketForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: TicketForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type TicketUpdateParams = {
  ticketId: number;
  ticket: Ticket | null;
};

export class TicketUpdateUsecase extends Usecase<
  TicketUpdateState,
  TicketUpdateAction,
  TicketUpdateParams
> {
  params: TicketUpdateParams;
  repository: TicketRepository;

  constructor(repository: TicketRepository, params: TicketUpdateParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): TicketUpdateState {
    return {
      type: this.params.ticket !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        code: this.params.ticket?.code ?? '',
        name: this.params.ticket?.name ?? '',
      },
    };
  }

  getNextState(
    state: TicketUpdateState,
    action: TicketUpdateAction
  ): TicketUpdateState {
    return match([state, action])
      .returnType<TicketUpdateState>()
      .with([{ type: 'idle' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .with([{ type: 'error' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { values }]) => ({
          ...state,
          type: 'loaded',
          values,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({
          ...state,
          values,
          type: 'submitting',
        })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({
          ...state,
          values,
          type: 'submitting',
        })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'submitSuccess',
        })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'submitError',
          errorMessage,
        })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TicketUpdateState,
    dispatch: (action: TicketUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchTicketById(this.params.ticketId)
          .then((ticket) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                code: ticket.code,
                name: ticket.name,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch ticket',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .updateTicket(values, this.params.ticketId)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
