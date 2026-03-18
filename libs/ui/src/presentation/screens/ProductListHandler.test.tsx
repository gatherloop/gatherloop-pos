import React from 'react';
import { render, act } from '@testing-library/react';
import { ProductListHandler } from './ProductListHandler';
import {
  MockAuthRepository,
  MockProductRepository,
  MockProductListQueryRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  ProductDeleteUsecase,
  ProductListUsecase,
} from '../../domain';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const productListCtrl = {
  state: {
    type: 'loaded' as string,
    products: [] as never[],
    page: 1,
    itemPerPage: 10,
    totalItem: 0,
    query: '',
    saleType: 'all' as const,
  },
  dispatch: jest.fn(),
};
const productDeleteCtrl = {
  state: { type: 'hidden' as string },
  dispatch: jest.fn(),
};
const authLogoutCtrl = {
  state: { type: 'idle' as string },
  dispatch: jest.fn(),
};

jest.mock('../controllers', () => ({
  useProductListController: () => ({
    state: productListCtrl.state,
    dispatch: productListCtrl.dispatch,
  }),
  useProductDeleteController: () => ({
    state: productDeleteCtrl.state,
    dispatch: productDeleteCtrl.dispatch,
  }),
  useAuthLogoutController: () => ({
    state: authLogoutCtrl.state,
    dispatch: authLogoutCtrl.dispatch,
  }),
}));

const createProps = () => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  productListUsecase: new ProductListUsecase(
    new MockProductRepository(),
    new MockProductListQueryRepository(),
    { products: [], totalItem: 0 }
  ),
  productDeleteUsecase: new ProductDeleteUsecase(new MockProductRepository()),
});

describe('ProductListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productListCtrl.state = {
      type: 'loaded',
      products: [],
      page: 1,
      itemPerPage: 10,
      totalItem: 0,
      query: '',
      saleType: 'all',
    };
    productDeleteCtrl.state = { type: 'hidden' };
    authLogoutCtrl.state = { type: 'idle' };
  });

  describe('delete → refetch orchestration', () => {
    it('should dispatch FETCH to product list when delete succeeds', async () => {
      productDeleteCtrl.state = { type: 'deletingSuccess' };

      await act(async () => {
        render(<ProductListHandler {...createProps()} />);
      });

      expect(productListCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when delete has not succeeded', async () => {
      productDeleteCtrl.state = { type: 'hidden' };

      await act(async () => {
        render(<ProductListHandler {...createProps()} />);
      });

      expect(productListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when delete is still in progress', async () => {
      productDeleteCtrl.state = { type: 'deleting' };

      await act(async () => {
        render(<ProductListHandler {...createProps()} />);
      });

      expect(productListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });

  describe('delete modal visibility', () => {
    it('should show delete modal when state is shown', () => {
      productDeleteCtrl.state = { type: 'shown' };

      const { getByText } = render(<ProductListHandler {...createProps()} />);

      expect(getByText('Delete Product ?')).toBeTruthy();
    });

    it('should not show delete modal when state is hidden', () => {
      productDeleteCtrl.state = { type: 'hidden' };

      const { queryByText } = render(<ProductListHandler {...createProps()} />);

      expect(queryByText('Delete Product ?')).toBeNull();
    });
  });

  describe('list variant rendering', () => {
    it('should render loading state when product list is loading', () => {
      productListCtrl.state = { ...productListCtrl.state, type: 'loading' };

      const { getByText } = render(<ProductListHandler {...createProps()} />);

      expect(getByText('Fetching Products...')).toBeTruthy();
    });

    it('should render empty state when loaded with no products', () => {
      productListCtrl.state = { ...productListCtrl.state, type: 'loaded', products: [] };

      const { getByText } = render(<ProductListHandler {...createProps()} />);

      expect(getByText('Oops, Product is Empty')).toBeTruthy();
    });

    it('should render error state when list fetch fails', () => {
      productListCtrl.state = { ...productListCtrl.state, type: 'error' };

      const { getByText } = render(<ProductListHandler {...createProps()} />);

      expect(getByText('Failed to Fetch Products')).toBeTruthy();
    });
  });
});
