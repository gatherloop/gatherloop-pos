// eslint-disable-next-line @nx/enforce-module-boundaries
import { ProductListQueryRepository } from '../../domain/repositories/productListQuery';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';
import { createStringUnionParser } from '../../utils/stringUnionParser';

export class UrlProductListQueryRepository
  implements ProductListQueryRepository
{
  getPage = (url?: string) => {
    const pageQuery = getQueryParam('page', url);
    return pageQuery ? parseInt(pageQuery) : 1;
  };

  setPage: ProductListQueryRepository['setPage'] = (page) => {
    setQueryParam('page', page.toString());
  };

  getItemPerPage = (url?: string) => {
    const itemPerPageQuery = getQueryParam('itemPerPage', url);
    return itemPerPageQuery ? parseInt(itemPerPageQuery) : 10;
  };

  setItemPerPage: ProductListQueryRepository['setItemPerPage'] = (
    itemPerPage
  ) => {
    setQueryParam('itemPerPage', itemPerPage.toString());
  };

  getSearchQuery = (url?: string) => {
    const searchQuery = getQueryParam('query', url);
    return searchQuery ?? '';
  };

  setSearchQuery: ProductListQueryRepository['setSearchQuery'] = (query) => {
    setQueryParam('query', query);
  };

  getSortBy = (url?: string) => {
    const sortByQuery = getQueryParam('sortBy', url);
    return sortByQuery ? toSortBy(sortByQuery) ?? 'created_at' : 'created_at';
  };

  setSortBy: ProductListQueryRepository['setSortBy'] = (sortBy) => {
    setQueryParam('sortBy', sortBy);
  };

  getOrderBy = (url?: string) => {
    const orderByQuery = getQueryParam('orderBy', url);
    return orderByQuery ? toOrderBy(orderByQuery) ?? 'desc' : 'desc';
  };

  setOrderBy: ProductListQueryRepository['setOrderBy'] = (orderBy) => {
    setQueryParam('orderBy', orderBy);
  };

  getSaleType = (url?: string) => {
    const saleTypeQuery = getQueryParam('saleType', url);
    return saleTypeQuery ? toSaleType(saleTypeQuery) ?? 'all' : 'all';
  };

  setSaleType: ProductListQueryRepository['setSaleType'] = (saleType) => {
    setQueryParam('saleType', saleType);
  };
}

const toSortBy = createStringUnionParser<'created_at'[]>(['created_at']);
const toOrderBy = createStringUnionParser<('asc' | 'desc')[]>(['asc', 'desc']);
const toSaleType = createStringUnionParser<('rental' | 'purchase' | 'all')[]>([
  'rental',
  'purchase',
  'all',
]);
