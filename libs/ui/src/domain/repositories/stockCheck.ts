import { StockCheck, StockCheckForm } from '../entities';

export interface StockCheckRepository {
  getStockCheckList: (params: {
    page: number;
    itemPerPage: number;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => {
    stockChecks: StockCheck[];
    totalItem: number;
  };

  fetchStockCheckList: (params: {
    page: number;
    itemPerPage: number;
    sortBy: 'created_at';
    orderBy: 'asc' | 'desc';
  }) => Promise<{ stockChecks: StockCheck[]; totalItem: number }>;

  fetchStockCheckById: (stockCheckId: number) => Promise<StockCheck>;

  createStockCheck: (form: StockCheckForm) => Promise<void>;

  updateStockCheck: (form: StockCheckForm, stockCheckId: number) => Promise<void>;

  deleteStockCheckById: (stockCheckId: number) => Promise<void>;
}
