import { StockCheckListQueryRepository } from '../../domain';

export class MockStockCheckListQueryRepository
  implements StockCheckListQueryRepository
{
  private page = 1;
  private itemPerPage = 10;
  private sortBy = 'created_at' as const;
  private orderBy: 'asc' | 'desc' = 'desc';

  getPage = () => this.page;
  setPage = (page: number) => { this.page = page; };

  getItemPerPage = () => this.itemPerPage;
  setItemPerPage = (itemPerPage: number) => { this.itemPerPage = itemPerPage; };

  getSortBy = () => this.sortBy;
  setSortBy = (sortBy: 'created_at') => { this.sortBy = sortBy; };

  getOrderBy = () => this.orderBy;
  setOrderBy = (orderBy: 'asc' | 'desc') => { this.orderBy = orderBy; };
}
