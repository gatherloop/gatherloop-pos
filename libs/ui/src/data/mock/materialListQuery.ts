import { MaterialListQueryRepository } from "../../domain";

export class MockMaterialListQueryRepository implements MaterialListQueryRepository {
    getPage = () => 1;
    getSearchQuery = () => '';
    getSortBy = () => 'created_at' as const;
    getOrderBy = () => 'asc' as const;
    getItemPerPage = () => 10;
    setPage = (page: number) => {};
    setItemPerPage = (itemPerPage: number) => {};
    setOrderBy = (orderBy: 'asc' | 'desc') => {};
    setSearchQuery = (searchQuery: string) => {};
    setSortBy = (sortBy: 'created_at') => {};
  }