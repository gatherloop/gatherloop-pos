import { QueryClient } from '@tanstack/react-query';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  rentalCheckin,
  rentalDeleteById,
  rentalList,
  RentalList200,
  rentalListQueryKey,
  rentalCheckout,
  RentalListQueryParams,
} from '../../../../api-contract/src';
import { Rental, RentalRepository } from '../../domain';
import { RequestConfig } from '@kubb/swagger-client/client';
import { toApiRentalCheckin, toApiRentalCheckout, toRental } from './rental.transformer';

export class ApiRentalRepository implements RentalRepository {
  client: QueryClient;

  constructor(client: QueryClient) {
    this.client = client;
  }

  checkinRentals: RentalRepository['checkinRentals'] = (formValues) => {
    return rentalCheckin(toApiRentalCheckin(formValues)).then();
  };

  checkoutRentals: RentalRepository['checkoutRentals'] = (formValues) => {
    return rentalCheckout(toApiRentalCheckout(formValues)).then(
      ({ data: { id } }) => ({ transactionId: id })
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
      rentals: res?.data.map(toRental) ?? [],
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
          rentals: data.data.map(toRental),
          totalItem: data.meta.total,
        };
      });
  };
}
