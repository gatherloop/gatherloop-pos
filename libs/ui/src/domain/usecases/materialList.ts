import { match, P } from 'ts-pattern';
import { Material } from '../entities';
import {
  MaterialRepository,
  MaterialListQueryRepository,
} from '../repositories';
import { createDebounce } from '../../utils/debounce';
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

export type MaterialListParams = {
  materials: Material[];
  totalItem: number;
  page?: number;
  query?: string;
  sortBy?: 'created_at';
  orderBy?: 'asc' | 'desc';
  itemPerPage?: number;
};

export class MaterialListUsecase extends Usecase<
  MaterialListState,
  MaterialListAction,
  MaterialListParams
> {
  params: MaterialListParams;
  materialRepository: MaterialRepository;
  materialListQueryRepository: MaterialListQueryRepository;

  constructor(
    materialRepository: MaterialRepository,
    materialListQueryRepository: MaterialListQueryRepository,
    params: MaterialListParams
  ) {
    super();
    this.materialRepository = materialRepository;
    this.materialListQueryRepository = materialListQueryRepository;
    this.params = params;
  }

  getInitialState() {
    const state: MaterialListState = {
      type: this.params.materials.length >= 1 ? 'loaded' : 'idle',
      totalItem: this.params.totalItem,
      page: this.params.page || this.materialListQueryRepository.getPage(),
      query:
        this.params.query || this.materialListQueryRepository.getSearchQuery(),
      errorMessage: null,
      sortBy:
        this.params.sortBy || this.materialListQueryRepository.getSortBy(),
      orderBy:
        this.params.orderBy || this.materialListQueryRepository.getOrderBy(),
      itemPerPage:
        this.params.itemPerPage ||
        this.materialListQueryRepository.getItemPerPage(),
      fetchDebounceDelay: 0,
      materials: this.params.materials,
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
          errorMessage: message,
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
          this.materialRepository
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
          this.materialListQueryRepository.setPage(page);
          this.materialListQueryRepository.setItemPerPage(itemPerPage);
          this.materialListQueryRepository.setOrderBy(orderBy);
          this.materialListQueryRepository.setSearchQuery(query);
          this.materialListQueryRepository.setSortBy(sortBy);

          changeParamsDebounce(() => {
            const { materials, totalItem } =
              this.materialRepository.getMaterialList({
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
          this.materialRepository
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
