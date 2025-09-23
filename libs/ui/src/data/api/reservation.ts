import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  reservationCheckin,
  reservationDeleteById,
  reservationList,
  ReservationList200,
  reservationListQueryKey,
  reservationCheckout,
  Reservation as ApiReservation,
  ReservationListQueryParams,
} from '../../../../api-contract/src';
import { Reservation, ReservationRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { variantTransformers } from './variant';

export class ApiReservationRepository implements ReservationRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  checkinReservations: ReservationRepository['checkinReservations'] = (
    formValues
  ) => {
    return reservationCheckin(
      formValues.reservations.map((reservation) => ({
        code: reservation.code,
        name: formValues.name,
        variantId: reservation.variant.id,
      }))
    ).then();
  };

  checkoutReservations: ReservationRepository['checkoutReservations'] = (
    formValues
  ) => {
    return reservationCheckout(
      formValues.reservations.map((reservation) => reservation.id)
    ).then(({ data: { transactionId } }) => ({ transactionId }));
  };

  deleteReservationById: ReservationRepository['deleteReservationById'] = (
    reservationId
  ) => {
    return reservationDeleteById(reservationId).then();
  };

  getReservationList: ReservationRepository['getReservationList'] = ({
    itemPerPage,
    orderBy,
    page,
    query,
    sortBy,
    checkoutStatus,
  }) => {
    const params: ReservationListQueryParams = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      checkoutStatus,
    };
    const res = this.client.getQueryState<ReservationList200>(
      reservationListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: reservationListQueryKey(params) });

    return {
      reservations: res?.data.map(transformers.reservation) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchReservationList = (
    {
      itemPerPage,
      orderBy,
      page,
      query,
      sortBy,
      checkoutStatus,
    }: {
      itemPerPage: number;
      orderBy: 'asc' | 'desc';
      page: number;
      query: string;
      sortBy: 'created_at';
      checkoutStatus: 'all' | 'completed' | 'ongoing';
    },
    options?: Partial<RequestConfig>
  ) => {
    const params: ReservationListQueryParams = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      checkoutStatus,
    };
    return this.client
      .fetchQuery({
        queryKey: reservationListQueryKey(params),
        queryFn: () => reservationList(params, options),
      })
      .then((data) => {
        return {
          reservations: data.data.map(transformers.reservation),
          totalItem: data.meta.total,
        };
      });
  };
}

const transformers = {
  reservation: (reservation: ApiReservation): Reservation => ({
    id: reservation.id,
    code: reservation.code,
    name: reservation.name,
    checkinAt: reservation.checkinAt,
    checkoutAt: reservation.checkoutAt ?? null,
    createdAt: reservation.createdAt,
    variant: variantTransformers.variant(reservation.variant),
  }),
};
