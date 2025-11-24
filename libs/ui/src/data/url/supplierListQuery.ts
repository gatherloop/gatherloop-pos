// eslint-disable-next-line @nx/enforce-module-boundaries
import { SupplierListQueryRepository } from '../../domain/repositories/supplierListQuery';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';
import { createStringUnionParser } from '../../utils/stringUnionParser';

export class UrlSupplierListQueryRepository
  implements SupplierListQueryRepository
{
  getPage = (url?: string) => {
    const pageQuery = getQueryParam('page', url);
    return pageQuery ? parseInt(pageQuery) : 1;
  };

  setPage: SupplierListQueryRepository['setPage'] = (page) => {
    setQueryParam('page', page.toString());
  };

  getItemPerPage = (url?: string) => {
    const itemPerPageQuery = getQueryParam('itemPerPage', url);
    return itemPerPageQuery ? parseInt(itemPerPageQuery) : 10;
  };

  setItemPerPage: SupplierListQueryRepository['setItemPerPage'] = (
    itemPerPage
  ) => {
    setQueryParam('itemPerPage', itemPerPage.toString());
  };

  getSearchQuery = (url?: string) => {
    const searchQuery = getQueryParam('query', url);
    return searchQuery ?? '';
  };

  setSearchQuery: SupplierListQueryRepository['setSearchQuery'] = (query) => {
    setQueryParam('query', query);
  };

  getSortBy = (url?: string) => {
    const sortByQuery = getQueryParam('sortBy', url);
    return sortByQuery ? toSortBy(sortByQuery) ?? 'created_at' : 'created_at';
  };

  setSortBy: SupplierListQueryRepository['setSortBy'] = (sortBy) => {
    setQueryParam('sortBy', sortBy);
  };

  getOrderBy = (url?: string) => {
    const orderByQuery = getQueryParam('orderBy', url);
    return orderByQuery ? toOrderBy(orderByQuery) ?? 'desc' : 'desc';
  };

  setOrderBy: SupplierListQueryRepository['setOrderBy'] = (orderBy) => {
    setQueryParam('orderBy', orderBy);
  };
}

const toSortBy = createStringUnionParser<'created_at'[]>(['created_at']);
const toOrderBy = createStringUnionParser<('asc' | 'desc')[]>(['asc', 'desc']);
