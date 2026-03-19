import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    productRepo?: MockProductRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const productRepo = options.productRepo ?? new MockProductRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    productListUsecase: new ProductListUsecase(
      productRepo,
      new MockProductListQueryRepository(),
      { products: [], totalItem: 0 }
    ),
    productDeleteUsecase: new ProductDeleteUsecase(productRepo),
  };
};

describe('ProductListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state initially', () => {
      render(<ProductListHandler {...createProps()} />);
      expect(screen.getByText('Fetching Products...')).toBeTruthy();
    });

    it('should show product list after successful fetch', async () => {
      render(<ProductListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Product 1' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Product 2' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const productRepo = new MockProductRepository();
      productRepo.setShouldFail(true);

      render(<ProductListHandler {...createProps({ productRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Products' })).toBeTruthy();
    });

    it('should show empty state when no products exist', async () => {
      const productRepo = new MockProductRepository();
      productRepo.products = [];

      render(<ProductListHandler {...createProps({ productRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Product is Empty' })).toBeTruthy();
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<ProductListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Product ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<ProductListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Product ?' })).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<ProductListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Product ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Product ?' })).toBeNull();
    });

    it('should refetch product list after successful delete', async () => {
      const user = userEvent.setup();
      const productRepo = new MockProductRepository();
      render(<ProductListHandler {...createProps({ productRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Product 1' })).toBeTruthy();

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Product ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Product ?' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Product 2' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to product edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<ProductListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/products/1');
    });

    it('should navigate to product page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<ProductListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('heading', { name: 'Product 1' }));

      expect(mockRouterPush).toHaveBeenCalledWith('/products/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch products when retry button is pressed', async () => {
      const user = userEvent.setup();
      const productRepo = new MockProductRepository();
      productRepo.setShouldFail(true);

      render(<ProductListHandler {...createProps({ productRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Products' })).toBeTruthy();

      productRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Product 1' })).toBeTruthy();
    });
  });
});
