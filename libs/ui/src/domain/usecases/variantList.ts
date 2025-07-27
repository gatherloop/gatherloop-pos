import { match, P } from 'ts-pattern';
import { Variant } from '../entities';
import { VariantRepository, VariantListQueryRepository } from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

type SortBy = 'created_at';

type OrderBy = 'asc' | 'desc';

type Context = {
  variants: Variant[];
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: SortBy;
  orderBy: OrderBy;
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type VariantListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type VariantListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; variants: Variant[]; totalItem: number }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      fetchDebounceDelay?: number;
    }
  | { type: 'REVALIDATE'; variants: Variant[]; totalItem: number }
  | { type: 'REVALIDATE_FINISH'; variants: Variant[]; totalItem: number };

export type VariantListParams = {
  variants: Variant[];
  totalItem: number;
  page?: number;
  query?: string;
  sortBy?: SortBy;
  orderBy?: OrderBy;
  itemPerPage?: number;
};

const changeParamsDebounce = createDebounce();

export class VariantListUsecase extends Usecase<
  VariantListState,
  VariantListAction,
  VariantListParams
> {
  variantRepository: VariantRepository;
  variantListQueryRepository: VariantListQueryRepository;

  params: VariantListParams;

  constructor(
    variantRepository: VariantRepository,
    variantListQueryRepository: VariantListQueryRepository,
    params: VariantListParams
  ) {
    super();
    this.variantRepository = variantRepository;
    this.variantListQueryRepository = variantListQueryRepository;
    this.params = params;
  }

  getInitialState(): VariantListState {
    const page = this.params.page ?? this.variantListQueryRepository.getPage();
    const itemPerPage =
      this.params.itemPerPage ??
      this.variantListQueryRepository.getItemPerPage();
    const query =
      this.params.query ?? this.variantListQueryRepository.getSearchQuery();
    const sortBy =
      this.params.sortBy ?? this.variantListQueryRepository.getSortBy();
    const orderBy =
      this.params.orderBy ?? this.variantListQueryRepository.getOrderBy();

    return {
      type: this.params.variants.length >= 1 ? 'loaded' : 'idle',
      variants: this.params.variants,
      totalItem: this.params.totalItem,
      page,
      query,
      errorMessage: null,
      sortBy,
      orderBy,
      itemPerPage,
      fetchDebounceDelay: 0,
    };
  }

  getNextState(state: VariantListState, action: VariantListAction) {
    return match([state, action])
      .returnType<VariantListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { variants, totalItem }]) => ({
          ...state,
          type: 'loaded',
          variants,
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
        ([state, { variants, totalItem }]) => ({
          ...state,
          variants,
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
    state: VariantListState,
    dispatch: (action: VariantListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy }) =>
          this.variantRepository
            .fetchVariantList({ page, itemPerPage, orderBy, query, sortBy })
            .then(({ variants, totalItem }) =>
              dispatch({ type: 'FETCH_SUCCESS', variants, totalItem })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch variants',
              })
            )
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, query, sortBy, fetchDebounceDelay }) => {
          this.variantListQueryRepository.setPage(page);
          this.variantListQueryRepository.setItemPerPage(itemPerPage);
          this.variantListQueryRepository.setOrderBy(orderBy);
          this.variantListQueryRepository.setSearchQuery(query);
          this.variantListQueryRepository.setSortBy(sortBy);

          changeParamsDebounce(() => {
            const { variants, totalItem } =
              this.variantRepository.getVariantList({
                page,
                itemPerPage,
                orderBy,
                query,
                sortBy,
              });

            if (variants.length > 0) {
              dispatch({ type: 'REVALIDATE', variants, totalItem });
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
          variants,
          totalItem,
        }) => {
          this.variantRepository
            .fetchVariantList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            })
            .then(({ variants, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', variants, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', variants, totalItem })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
