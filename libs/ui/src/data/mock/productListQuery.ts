import { ProductListQueryRepository } from '../../domain/repositories/productListQuery';

export class MockProductListQueryRepository
  implements ProductListQueryRepository
{
  getPage = () => 1;
  getItemPerPage = () => 10;
  getSearchQuery = () => '';
  getSortBy = () => 'created_at' as const;
  getOrderBy = () => 'asc' as const;
  getSaleType = () => 'all' as const;

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
  setSaleType = (saleType: 'purchase' | 'rental' | 'all') => {
    console.log(`Setting sale type to ${saleType}`);
  };
}
