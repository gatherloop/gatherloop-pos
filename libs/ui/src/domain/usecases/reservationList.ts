import { match, P } from 'ts-pattern';
import { CheckoutStatus, Reservation } from '../entities';
import {
  ReservationRepository,
  ReservationListQueryRepository,
} from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

type Context = {
  reservations: Reservation[];
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

export type ReservationListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type ReservationListAction =
  | { type: 'FETCH' }
  | {
      type: 'FETCH_SUCCESS';
      reservations: Reservation[];
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
  | { type: 'REVALIDATE'; reservations: Reservation[]; totalItem: number }
  | {
      type: 'REVALIDATE_FINISH';
      reservations: Reservation[];
      totalItem: number;
    };

export type ReservationListParams = {
  page?: number;
  query?: string;
  checkoutStatus?: CheckoutStatus;
  sortBy?: 'created_at';
  orderBy?: 'asc' | 'desc';
  itemPerPage?: number;
  reservations: Reservation[];
  totalItem: number;
};

const changeParamsDebounce = createDebounce();

export class ReservationListUsecase extends Usecase<
  ReservationListState,
  ReservationListAction,
  ReservationListParams
> {
  params: ReservationListParams;
  reservationRepository: ReservationRepository;
  reservationListQueryRepository: ReservationListQueryRepository;

  constructor(
    reservationRepository: ReservationRepository,
    reservationListQueryRepository: ReservationListQueryRepository,
    params: ReservationListParams
  ) {
    super();
    this.reservationRepository = reservationRepository;
    this.reservationListQueryRepository = reservationListQueryRepository;
    this.params = params;
  }

  getInitialState() {
    const state: ReservationListState = {
      type: this.params.reservations.length > 0 ? 'loaded' : 'idle',
      totalItem: this.params.totalItem,
      page: this.params.page ?? this.reservationListQueryRepository.getPage(),
      query:
        this.params.query ??
        this.reservationListQueryRepository.getSearchQuery(),
      checkoutStatus:
        this.params.checkoutStatus ??
        this.reservationListQueryRepository.getCheckoutStatus(),
      errorMessage: null,
      sortBy:
        this.params.sortBy ?? this.reservationListQueryRepository.getSortBy(),
      orderBy:
        this.params.orderBy ?? this.reservationListQueryRepository.getOrderBy(),
      itemPerPage:
        this.params.itemPerPage ??
        this.reservationListQueryRepository.getItemPerPage(),
      fetchDebounceDelay: 0,
      reservations: this.params.reservations,
    };

    return state;
  }

  getNextState(state: ReservationListState, action: ReservationListAction) {
    return match([state, action])
      .returnType<ReservationListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { reservations, totalItem }]) => ({
          ...state,
          type: 'loaded',
          reservations,
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
        ([state, { reservations, totalItem }]) => ({
          ...state,
          reservations,
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
    state: ReservationListState,
    dispatch: (action: ReservationListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy, checkoutStatus }) => {
          this.reservationRepository
            .fetchReservationList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
              checkoutStatus,
            })
            .then(({ reservations, totalItem }) =>
              dispatch({
                type: 'FETCH_SUCCESS',
                reservations,
                totalItem,
              })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch reservations',
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
          this.reservationListQueryRepository.setPage(page);
          this.reservationListQueryRepository.setSearchQuery(query);
          this.reservationListQueryRepository.setOrderBy(orderBy);
          this.reservationListQueryRepository.setSortBy(sortBy);
          this.reservationListQueryRepository.setItemPerPage(itemPerPage);
          this.reservationListQueryRepository.setCheckoutStatus(checkoutStatus);

          changeParamsDebounce(() => {
            const { reservations, totalItem } =
              this.reservationRepository.getReservationList({
                page,
                itemPerPage,
                orderBy,
                query,
                sortBy,
                checkoutStatus,
              });

            if (reservations.length > 0) {
              dispatch({ type: 'REVALIDATE', reservations, totalItem });
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
          reservations,
          totalItem,
        }) => {
          this.reservationRepository
            .fetchReservationList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
              checkoutStatus,
            })
            .then(({ reservations, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', reservations, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', reservations, totalItem })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
