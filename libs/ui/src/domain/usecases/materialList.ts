import { match, P } from 'ts-pattern';
import { Material } from '../entities';
import { MaterialRepository } from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

type Context = {
  materials: Material[];
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type MaterialListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type MaterialListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; materials: Material[]; totalItem: number }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      fetchDebounceDelay?: number;
    }
  | { type: 'REVALIDATE'; materials: Material[]; totalItem: number }
  | { type: 'REVALIDATE_FINISH'; materials: Material[]; totalItem: number };

const changeParamsDebounce = createDebounce();

export class MaterialListUsecase extends Usecase<
  MaterialListState,
  MaterialListAction
> {
  repository: MaterialRepository;

  constructor(repository: MaterialRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const initialParams = this.repository.getMaterialListServerParams();
    const { materials, totalItem } =
      this.repository.getMaterialList(initialParams);

    const state: MaterialListState = {
      type: materials.length >= 1 ? 'loaded' : 'idle',
      totalItem,
      page: initialParams.page,
      query: initialParams.query,
      errorMessage: null,
      sortBy: initialParams.sortBy,
      orderBy: initialParams.orderBy,
      itemPerPage: initialParams.itemPerPage,
      fetchDebounceDelay: 0,
      materials,
    };

    return state;
  }

  getNextState(state: MaterialListState, action: MaterialListAction) {
    return match([state, action])
      .returnType<MaterialListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { materials, totalItem }]) => ({
          ...state,
          type: 'loaded',
          materials,
          totalItem,
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
        [
          {
            type: P.union(
              'loaded',
              'changingParams',
              'loading',
              'error',
              'revalidating'
            ),
          },
          { type: P.union('CHANGE_PARAMS') },
        ],
        ([state, { type: _type, fetchDebounceDelay = 0, ...params }]) => ({
          ...state,
          ...params,
          fetchDebounceDelay,
          type: 'changingParams',
        })
      )
      .with([{ type: 'changingParams' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'changingParams' }, { type: 'REVALIDATE' }],
        ([state, { materials, totalItem }]) => ({
          ...state,
          materials,
          totalItem,
          type: 'revalidating',
        })
      )
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
    state: MaterialListState,
    dispatch: (action: MaterialListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy }) =>
          this.repository
            .fetchMaterialList({ page, itemPerPage, orderBy, query, sortBy })
            .then(({ materials, totalItem }) =>
              dispatch({ type: 'FETCH_SUCCESS', materials, totalItem })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch materials',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, query, sortBy, fetchDebounceDelay }) => {
          changeParamsDebounce(() => {
            const { materials, totalItem } = this.repository.getMaterialList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            });

            if (materials.length > 0) {
              dispatch({ type: 'REVALIDATE', materials, totalItem });
            } else {
              dispatch({ type: 'FETCH' });
            }
          }, fetchDebounceDelay);
        }
      )
      .with(
        { type: 'revalidating' },
        ({
          page,
          itemPerPage,
          orderBy,
          query,
          sortBy,
          materials,
          totalItem,
        }) => {
          this.repository
            .fetchMaterialList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            })
            .then(({ materials, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', materials, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', materials, totalItem })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
