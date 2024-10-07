import { match, P } from 'ts-pattern';
import { Category } from '../entities';
import { CategoryRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  categories: Category[];
  errorMessage: string | null;
};

export type CategoryListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type CategoryListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; categories: Category[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE'; categories: Category[] }
  | { type: 'REVALIDATE_FINISH'; categories: Category[] };

export class CategoryListUsecase extends Usecase<
  CategoryListState,
  CategoryListAction
> {
  repository: CategoryRepository;

  constructor(repository: CategoryRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const categories = this.repository.getCategoryList();

    const state: CategoryListState = {
      type: categories.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      categories,
    };

    return state;
  }

  getNextState(state: CategoryListState, action: CategoryListAction) {
    return match([state, action])
      .returnType<CategoryListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { categories }]) => ({
          ...state,
          type: 'loaded',
          categories,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { type: _type, ...params }]) => ({
          ...state,
          ...params,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: CategoryListState,
    dispatch: (action: CategoryListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchCategoryList()
          .then((categories) => dispatch({ type: 'FETCH_SUCCESS', categories }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch categories',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ categories }) => {
        this.repository
          .fetchCategoryList()
          .then((categories) =>
            dispatch({ type: 'REVALIDATE_FINISH', categories })
          )
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', categories }));
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
