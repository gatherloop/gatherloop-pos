import { match } from 'ts-pattern';
import { TagRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  tagId: number | null;
};

export type TagDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type TagDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; tagId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class TagDeleteUsecase extends Usecase<TagDeleteState, TagDeleteAction> {
  params: undefined;
  repository: TagRepository;

  constructor(repository: TagRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TagDeleteState {
    return {
      type: 'hidden',
      tagId: null,
    };
  }
  getNextState(state: TagDeleteState, action: TagDeleteAction): TagDeleteState {
    return match([state, action])
      .returnType<TagDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { tagId }]) => ({ type: 'shown', tagId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        tagId: null,
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
          tagId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: TagDeleteState,
    dispatch: (action: TagDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ tagId }) => {
        this.repository
          .deleteTagById(tagId ?? NaN)
          .then(() => dispatch({ type: 'DELETE_SUCCESS' }))
          .catch(() => dispatch({ type: 'DELETE_ERROR' }));
      })
      .with({ type: 'deletingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'deletingError' }, () => {
        dispatch({ type: 'DELETE_CANCEL' });
      })
      .otherwise(() => undefined);
  }
}
