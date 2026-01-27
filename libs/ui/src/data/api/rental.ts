import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  rentalCheckin,
  rentalDeleteById,
  rentalList,
  RentalList200,
  rentalListQueryKey,
  rentalCheckout,
  Rental as ApiRental,
  RentalListQueryParams,
} from '../../../../api-contract/src';
import { Rental, RentalRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { variantTransformers } from './variant';

export class ApiRentalRepository implements RentalRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  checkinRentals: RentalRepository['checkinRentals'] = ({
    name,
    checkinAt,
    rentals,
  }) => {
    return rentalCheckin(
      rentals.map((rental) => ({
        code: rental.code,
        name,
        variantId: rental.variant.id,
        checkinAt: checkinAt
          ? new Date(
              checkinAt.year,
              checkinAt.month,
              checkinAt.date,
              checkinAt.hour,
              checkinAt.minute,
              0,
              0
            ).toISOString()
          : new Date().toISOString(),
      }))
    ).then();
  };

  checkoutRentals: RentalRepository['checkoutRentals'] = (formValues) => {
    return rentalCheckout(formValues.rentals.map((rental) => rental.id)).then(
      ({ data: { transactionId } }) => ({ transactionId })
    );
  };

  deleteRentalById: RentalRepository['deleteRentalById'] = (rentalId) => {
    return rentalDeleteById(rentalId).then();
  };

  getRentalList: RentalRepository['getRentalList'] = ({
    itemPerPage,
    orderBy,
    page,
    query,
    sortBy,
    checkoutStatus,
  }) => {
    const params: RentalListQueryParams = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      checkoutStatus,
    };
    const res = this.client.getQueryState<RentalList200>(
      rentalListQueryKey(params)
    )?.data;

    this.client.removeQueries({ queryKey: rentalListQueryKey(params) });

    return {
      rentals: res?.data.map(transformers.rental) ?? [],
      totalItem: res?.meta.total ?? 0,
    };
  };

  fetchRentalList = (
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
    const params: RentalListQueryParams = {
      query,
      skip: (page - 1) * itemPerPage,
      limit: itemPerPage,
      order: orderBy,
      sortBy,
      checkoutStatus,
    };
    return this.client
      .fetchQuery({
        queryKey: rentalListQueryKey(params),
        queryFn: () => rentalList(params, options),
      })
      .then((data) => {
        return {
          rentals: data.data.map(transformers.rental),
          totalItem: data.meta.total,
        };
      });
  };
}

const transformers = {
  rental: (rental: ApiRental): Rental => ({
    id: rental.id,
    code: rental.code,
    name: rental.name,
    checkinAt: rental.checkinAt,
    checkoutAt: rental.checkoutAt ?? null,
    createdAt: rental.createdAt,
    variant: variantTransformers.variant(rental.variant),
  }),
};
