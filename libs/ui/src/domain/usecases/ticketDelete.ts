import { match } from 'ts-pattern';
import { TicketRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  ticketId: number | null;
};

export type TicketDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type TicketDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; ticketId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class TicketDeleteUsecase extends Usecase<
  TicketDeleteState,
  TicketDeleteAction
> {
  params: undefined;
  repository: TicketRepository;

  constructor(repository: TicketRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TicketDeleteState {
    return {
      type: 'hidden',
      ticketId: null,
    };
  }
  getNextState(
    state: TicketDeleteState,
    action: TicketDeleteAction
  ): TicketDeleteState {
    return match([state, action])
      .returnType<TicketDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { ticketId }]) => ({ type: 'shown', ticketId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        ticketId: null,
      }))
      .with([{ type: 'shown' }, { type: 'DELETE' }], ([state]) => ({
        ...state,
        type: 'deleting',
      }))
      .with([{ type: 'deleting' }, { type: 'DELETE_ERROR' }], ([state]) => ({
        ...state,
        type: 'deletingError',
      }))
      .with(
        [{ type: 'deletingError' }, { type: 'DELETE_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with([{ type: 'deleting' }, { type: 'DELETE_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'deletingSuccess',
      }))
      .with(
        [{ type: 'deletingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          ticketId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: TicketDeleteState,
    dispatch: (action: TicketDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ ticketId }) => {
        this.repository
          .deleteTicketById(ticketId ?? NaN)
          .then(() => dispatch({ type: 'DELETE_SUCCESS' }))
          .catch(() => dispatch({ type: 'DELETE_ERROR' }));
      })
      .with({ type: 'deletingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'deletingError' }, () => {
        dispatch({ type: 'DELETE_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
