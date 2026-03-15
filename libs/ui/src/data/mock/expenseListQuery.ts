import { ExpenseListQueryRepository } from '../../domain/repositories/expenseListQuery';

export class MockExpenseListQueryRepository
  implements ExpenseListQueryRepository
{
  getPage = () => 1;
  getItemPerPage = () => 10;
  getSearchQuery = () => '';
  getSortBy = () => 'created_at' as const;
  getOrderBy = () => 'asc' as const;
  getWalletId = () => null as number | null;
  getBudgetId = () => null as number | null;

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
  setWalletId = (walletId: number | null) => {
    console.log(`Setting wallet id to ${walletId}`);
  };
  setBudgetId = (budgetId: number | null) => {
    console.log(`Setting budget id to ${budgetId}`);
  };
}
