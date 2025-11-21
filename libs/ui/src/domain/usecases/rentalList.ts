import { match, P } from 'ts-pattern';
import { CheckoutStatus, Rental } from '../entities';
import { RentalRepository, RentalListQueryRepository } from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

type Context = {
  rentals: Rental[];
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  checkoutStatus: CheckoutStatus;
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type RentalListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type RentalListAction =
  | { type: 'FETCH' }
  | {
      type: 'FETCH_SUCCESS';
      rentals: Rental[];
      totalItem: number;
    }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      fetchDebounceDelay?: number;
      checkoutStatus?: CheckoutStatus;
    }
  | { type: 'REVALIDATE'; rentals: Rental[]; totalItem: number }
  | {
      type: 'REVALIDATE_FINISH';
      rentals: Rental[];
      totalItem: number;
    };

export type RentalListParams = {
  page?: number;
  query?: string;
  checkoutStatus?: CheckoutStatus;
  sortBy?: 'created_at';
  orderBy?: 'asc' | 'desc';
  itemPerPage?: number;
  rentals: Rental[];
  totalItem: number;
};

const changeParamsDebounce = createDebounce();

export class RentalListUsecase extends Usecase<
  RentalListState,
  RentalListAction,
  RentalListParams
> {
  params: RentalListParams;
  rentalRepository: RentalRepository;
  rentalListQueryRepository: RentalListQueryRepository;

  constructor(
    rentalRepository: RentalRepository,
    rentalListQueryRepository: RentalListQueryRepository,
    params: RentalListParams
  ) {
    super();
    this.rentalRepository = rentalRepository;
    this.rentalListQueryRepository = rentalListQueryRepository;
    this.params = params;
  }

  getInitialState() {
    const state: RentalListState = {
      type: this.params.rentals.length > 0 ? 'loaded' : 'idle',
      totalItem: this.params.totalItem,
      page: this.params.page ?? this.rentalListQueryRepository.getPage(),
      query:
        this.params.query ?? this.rentalListQueryRepository.getSearchQuery(),
      checkoutStatus:
        this.params.checkoutStatus ??
        this.rentalListQueryRepository.getCheckoutStatus(),
      errorMessage: null,
      sortBy: this.params.sortBy ?? this.rentalListQueryRepository.getSortBy(),
      orderBy:
        this.params.orderBy ?? this.rentalListQueryRepository.getOrderBy(),
      itemPerPage:
        this.params.itemPerPage ??
        this.rentalListQueryRepository.getItemPerPage(),
      fetchDebounceDelay: 0,
      rentals: this.params.rentals,
    };

    return state;
  }

  getNextState(state: RentalListState, action: RentalListAction) {
    return match([state, action])
      .returnType<RentalListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { rentals, totalItem }]) => ({
          ...state,
          type: 'loaded',
          rentals,
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
        ([state, { rentals, totalItem }]) => ({
          ...state,
          rentals,
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
    state: RentalListState,
    dispatch: (action: RentalListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy, checkoutStatus }) => {
          this.rentalRepository
            .fetchRentalList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
              checkoutStatus,
            })
            .then(({ rentals, totalItem }) =>
              dispatch({
                type: 'FETCH_SUCCESS',
                rentals,
                totalItem,
              })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch rentals',
              })
            );
        }
      )
      .with(
        { type: 'changingParams' },
        ({
          page,
          itemPerPage,
          orderBy,
          query,
          sortBy,
          fetchDebounceDelay,
          checkoutStatus,
        }) => {
          this.rentalListQueryRepository.setPage(page);
          this.rentalListQueryRepository.setSearchQuery(query);
          this.rentalListQueryRepository.setOrderBy(orderBy);
          this.rentalListQueryRepository.setSortBy(sortBy);
          this.rentalListQueryRepository.setItemPerPage(itemPerPage);
          this.rentalListQueryRepository.setCheckoutStatus(checkoutStatus);

          changeParamsDebounce(() => {
            const { rentals, totalItem } = this.rentalRepository.getRentalList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
              checkoutStatus,
            });

            if (rentals.length > 0) {
              dispatch({ type: 'REVALIDATE', rentals, totalItem });
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
          checkoutStatus,
          rentals,
          totalItem,
        }) => {
          this.rentalRepository
            .fetchRentalList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
              checkoutStatus,
            })
            .then(({ rentals, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', rentals, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', rentals, totalItem })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
