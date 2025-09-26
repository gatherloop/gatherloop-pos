// eslint-disable-next-line @nx/enforce-module-boundaries
import { ExpenseListQueryRepository } from '../../domain';
import { getQueryParam, setQueryParam } from '../../utils/queryParam';
import { createStringUnionParser } from '../../utils/stringUnionParser';

export class UrlExpenseListQueryRepository
  implements ExpenseListQueryRepository
{
  getPage = (url?: string) => {
    const pageQuery = getQueryParam('page', url);
    return pageQuery ? parseInt(pageQuery) : 1;
  };

  setPage: ExpenseListQueryRepository['setPage'] = (page) => {
    setQueryParam('page', page.toString());
  };

  getItemPerPage = (url?: string) => {
    const itemPerPageQuery = getQueryParam('itemPerPage', url);
    return itemPerPageQuery ? parseInt(itemPerPageQuery) : 10;
  };

  setItemPerPage: ExpenseListQueryRepository['setItemPerPage'] = (
    itemPerPage
  ) => {
    setQueryParam('itemPerPage', itemPerPage.toString());
  };

  getSearchQuery = (url?: string) => {
    const searchQuery = getQueryParam('query', url);
    return searchQuery ?? '';
  };

  setSearchQuery: ExpenseListQueryRepository['setSearchQuery'] = (query) => {
    setQueryParam('query', query);
  };

  getSortBy = (url?: string) => {
    const sortByQuery = getQueryParam('sortBy', url);
    return sortByQuery ? toSortBy(sortByQuery) ?? 'created_at' : 'created_at';
  };

  setSortBy: ExpenseListQueryRepository['setSortBy'] = (sortBy) => {
    setQueryParam('sortBy', sortBy);
  };

  getOrderBy = (url?: string) => {
    const orderByQuery = getQueryParam('orderBy', url);
    return orderByQuery ? toOrderBy(orderByQuery) ?? 'desc' : 'desc';
  };

  setOrderBy: ExpenseListQueryRepository['setOrderBy'] = (orderBy) => {
    setQueryParam('orderBy', orderBy);
  };

  getWalletId = (url?: string): number | null => {
    const walletId = getQueryParam('walletId', url);
    return walletId === 'all' || walletId === undefined
      ? null
      : parseInt(walletId);
  };

  setWalletId = (walletId: number | null) => {
    setQueryParam('walletId', walletId === null ? 'all' : walletId.toString());
  };

  getBudgetId = (url?: string): number | null => {
    const budgetId = getQueryParam('budgetId', url);
    return budgetId === 'all' || budgetId === undefined
      ? null
      : parseInt(budgetId);
  };

  setBudgetId = (walletId: number | null) => {
    setQueryParam('walletId', walletId === null ? 'all' : walletId.toString());
  };
}

const toSortBy = createStringUnionParser<'created_at'[]>(['created_at']);
const toOrderBy = createStringUnionParser<('asc' | 'desc')[]>(['asc', 'desc']);
