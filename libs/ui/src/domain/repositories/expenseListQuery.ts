export interface ExpenseListQueryRepository {
  getPage: () => number;
  setPage: (page: number) => void;

  getItemPerPage: () => number;
  setItemPerPage: (itemPerPage: number) => void;

  getSearchQuery: () => string;
  setSearchQuery: (query: string) => void;

  getSortBy: () => 'created_at';
  setSortBy: (sortBy: 'created_at') => void;

  getOrderBy: () => 'asc' | 'desc';
  setOrderBy: (orderBy: 'asc' | 'desc') => void;

  getWalletId: () => number | null;
  setWalletId: (walletId: number | null) => void;

  getBudgetId: () => number | null;
  setBudgetId: (budgetId: number | null) => void;
}
