// eslint-disable-next-line @nx/enforce-module-boundaries
import { StockCheckListQueryRepository } from '../../domain/repositories/stockCheckListQuery';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';
import { createStringUnionParser } from '../../utils/stringUnionParser';

export class UrlStockCheckListQueryRepository
  implements StockCheckListQueryRepository
{
  getPage = (url?: string) => {
    const pageQuery = getQueryParam('page', url);
    return pageQuery ? parseInt(pageQuery) : 1;
  };

  setPage: StockCheckListQueryRepository['setPage'] = (page) => {
    setQueryParam('page', page.toString());
  };

  getItemPerPage = (url?: string) => {
    const itemPerPageQuery = getQueryParam('itemPerPage', url);
    return itemPerPageQuery ? parseInt(itemPerPageQuery) : 10;
  };

  setItemPerPage: StockCheckListQueryRepository['setItemPerPage'] = (
    itemPerPage
  ) => {
    setQueryParam('itemPerPage', itemPerPage.toString());
  };

  getSortBy = (url?: string) => {
    const sortByQuery = getQueryParam('sortBy', url);
    return sortByQuery ? toSortBy(sortByQuery) ?? 'created_at' : 'created_at';
  };

  setSortBy: StockCheckListQueryRepository['setSortBy'] = (sortBy) => {
    setQueryParam('sortBy', sortBy);
  };

  getOrderBy = (url?: string) => {
    const orderByQuery = getQueryParam('orderBy', url);
    return orderByQuery ? toOrderBy(orderByQuery) ?? 'desc' : 'desc';
  };

  setOrderBy: StockCheckListQueryRepository['setOrderBy'] = (orderBy) => {
    setQueryParam('orderBy', orderBy);
  };
}

const toSortBy = createStringUnionParser<'created_at'[]>(['created_at']);
const toOrderBy = createStringUnionParser<('asc' | 'desc')[]>(['asc', 'desc']);
