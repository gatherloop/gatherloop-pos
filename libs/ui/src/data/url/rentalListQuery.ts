// eslint-disable-next-line @nx/enforce-module-boundaries
import { CheckoutStatus, RentalListQueryRepository } from '../../domain';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';
import { createStringUnionParser } from '../../utils/stringUnionParser';

export class UrlRentalListQueryRepository implements RentalListQueryRepository {
  getPage = (url?: string) => {
    const pageQuery = getQueryParam('page', url);
    return pageQuery ? parseInt(pageQuery) : 1;
  };

  setPage: RentalListQueryRepository['setPage'] = (page) => {
    setQueryParam('page', page.toString());
  };

  getItemPerPage = (url?: string) => {
    const itemPerPageQuery = getQueryParam('itemPerPage', url);
    return itemPerPageQuery ? parseInt(itemPerPageQuery) : 10;
  };

  setItemPerPage: RentalListQueryRepository['setItemPerPage'] = (
    itemPerPage
  ) => {
    setQueryParam('itemPerPage', itemPerPage.toString());
  };

  getSearchQuery = (url?: string) => {
    const searchQuery = getQueryParam('query', url);
    return searchQuery ?? '';
  };

  setSearchQuery: RentalListQueryRepository['setSearchQuery'] = (query) => {
    setQueryParam('query', query);
  };

  getSortBy = (url?: string) => {
    const sortByQuery = getQueryParam('sortBy', url);
    return sortByQuery ? toSortBy(sortByQuery) ?? 'created_at' : 'created_at';
  };

  setSortBy: RentalListQueryRepository['setSortBy'] = (sortBy) => {
    setQueryParam('sortBy', sortBy);
  };

  getOrderBy = (url?: string) => {
    const orderByQuery = getQueryParam('orderBy', url);
    return orderByQuery ? toOrderBy(orderByQuery) ?? 'desc' : 'desc';
  };

  setOrderBy: RentalListQueryRepository['setOrderBy'] = (orderBy) => {
    setQueryParam('orderBy', orderBy);
  };

  getCheckoutStatus = (url?: string): CheckoutStatus => {
    const checkoutStatusQuery = getQueryParam('checkoutStatus', url);
    return checkoutStatusQuery
      ? toCheckoutStatus(checkoutStatusQuery) ?? 'all'
      : 'all';
  };

  setCheckoutStatus = (paymentStatus: CheckoutStatus) => {
    setQueryParam('paymentStatus', paymentStatus);
  };
}

const toSortBy = createStringUnionParser<'created_at'[]>(['created_at']);
const toOrderBy = createStringUnionParser<('asc' | 'desc')[]>(['asc', 'desc']);
const toCheckoutStatus = createStringUnionParser<CheckoutStatus[]>([
  'all',
  'completed',
  'ongoing',
]);
