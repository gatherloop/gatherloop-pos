import { CheckoutStatus } from '../../domain/entities';
import { RentalListQueryRepository } from '../../domain/repositories/rentalListQuery';

export class MockRentalListQueryRepository
  implements RentalListQueryRepository
{
  getPage = () => 1;
  getItemPerPage = () => 10;
  getSearchQuery = () => '';
  getSortBy = () => 'created_at' as const;
  getOrderBy = () => 'asc' as const;
  getCheckoutStatus = () => 'all' as CheckoutStatus;

  setPage = (page: number) => {
    console.log(`Setting page to ${page}`);
  };
  setItemPerPage = (itemPerPage: number) => {
    console.log(`Setting items per page to ${itemPerPage}`);
  };
  setSearchQuery = (query: string) => {
    console.log(`Setting search query to ${query}`);
  };
  setSortBy = (sortBy: 'created_at') => {
    console.log(`Setting sort by to ${sortBy}`);
  };
  setOrderBy = (orderBy: 'asc' | 'desc') => {
    console.log(`Setting order by to ${orderBy}`);
  };
  setCheckoutStatus = (checkoutStatus: CheckoutStatus) => {
    console.log(`Setting checkout status to ${checkoutStatus}`);
  };
}
