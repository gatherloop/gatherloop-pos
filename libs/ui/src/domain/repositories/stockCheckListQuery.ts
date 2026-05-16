export interface StockCheckListQueryRepository {
  getPage: () => number;
  setPage: (page: number) => void;

  getItemPerPage: () => number;
  setItemPerPage: (itemPerPage: number) => void;

  getSortBy: () => 'created_at';
  setSortBy: (sortBy: 'created_at') => void;

  getOrderBy: () => 'asc' | 'desc';
  setOrderBy: (orderBy: 'asc' | 'desc') => void;
}
