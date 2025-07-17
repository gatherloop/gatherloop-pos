import { MaterialListQueryRepository } from '../../domain';

export class MockMaterialListQueryRepository
  implements MaterialListQueryRepository
{
  getPage = () => 1;
  getSearchQuery = () => '';
  getSortBy = () => 'created_at' as const;
  getOrderBy = () => 'asc' as const;
  getItemPerPage = () => 10;
  setPage = (page: number) => {
    console.log(`Setting page to ${page}`);
  };
  setItemPerPage = (itemPerPage: number) => {
    console.log(`Setting items per page to ${itemPerPage}`);
  };
  setOrderBy = (orderBy: 'asc' | 'desc') => {
    console.log(`Setting order by to ${orderBy}`);
  };
  setSearchQuery = (searchQuery: string) => {
    console.log(`Setting search query to ${searchQuery}`);
  };
  setSortBy = (sortBy: 'created_at') => {
    console.log(`Setting sort by to ${sortBy}`);
  };
}
