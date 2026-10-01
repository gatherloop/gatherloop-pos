import { match } from 'ts-pattern';
import { Tag, TagForm } from '../entities';
import { TagRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: TagForm;
};

export type TagUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type TagUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: TagForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: TagForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type TagUpdateParams = {
  tagId: number;
  tag: Tag | null;
};

export class TagUpdateUsecase extends Usecase<
  TagUpdateState,
  TagUpdateAction,
  TagUpdateParams
> {
  params: TagUpdateParams;
  repository: TagRepository;

  constructor(repository: TagRepository, params: TagUpdateParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): TagUpdateState {
    return {
      type: this.params.tag !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        name: this.params.tag?.name ?? '',
        color: this.params.tag?.color ?? 'gray',
        isHighlighted: this.params.tag?.isHighlighted ?? false,
        sortOrder: this.params.tag?.sortOrder ?? 0,
      },
    };
  }

  getNextState(state: TagUpdateState, action: TagUpdateAction): TagUpdateState {
    return match([state, action])
      .returnType<TagUpdateState>()
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
    state: TagUpdateState,
    dispatch: (action: TagUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchTagById(this.params.tagId)
          .then((tag) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                name: tag.name,
                color: tag.color,
                isHighlighted: tag.isHighlighted,
                sortOrder: tag.sortOrder,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch tag',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .updateTag(values, this.params.tagId)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => undefined);
  }
}
