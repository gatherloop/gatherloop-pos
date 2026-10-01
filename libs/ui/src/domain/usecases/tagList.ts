import { match, P } from 'ts-pattern';
import { Tag } from '../entities';
import { TagRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  tags: Tag[];
  errorMessage: string | null;
};

export type TagListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type TagListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; tags: Tag[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE'; tags: Tag[] }
  | { type: 'REVALIDATE_FINISH'; tags: Tag[] };

export type TagListParams = {
  tags: Tag[];
};

export class TagListUsecase extends Usecase<
  TagListState,
  TagListAction,
  TagListParams
> {
  params: TagListParams;
  repository: TagRepository;

  constructor(repository: TagRepository, params: TagListParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState() {
    const state: TagListState = {
      type: this.params.tags.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      tags: this.params.tags,
    };
    return state;
  }

  getNextState(state: TagListState, action: TagListAction) {
    return match([state, action])
      .returnType<TagListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { tags }]) => ({
          ...state,
          type: 'loaded',
          tags,
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
        ([state, { tags }]) => ({
          ...state,
          type: 'loaded',
          tags,
          errorMessage: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TagListState,
    dispatch: (action: TagListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchTagList()
          .then((tags) => dispatch({ type: 'FETCH_SUCCESS', tags }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch tags',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ tags }) => {
        this.repository
          .fetchTagList()
          .then((tags) => dispatch({ type: 'REVALIDATE_FINISH', tags }))
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', tags }));
      })
      .otherwise(() => undefined);
  }
}
