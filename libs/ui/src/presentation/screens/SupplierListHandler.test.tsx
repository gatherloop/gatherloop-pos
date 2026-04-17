import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SupplierListHandler } from './SupplierListHandler';
import {
  MockAuthRepository,
  MockSupplierRepository,
  MockSupplierListQueryRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  SupplierDeleteUsecase,
  SupplierListUsecase,
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
    supplierRepo?: MockSupplierRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const supplierRepo = options.supplierRepo ?? new MockSupplierRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    supplierListUsecase: new SupplierListUsecase(
      supplierRepo,
      new MockSupplierListQueryRepository(),
      { suppliers: [], totalItem: 0 }
    ),
    supplierDeleteUsecase: new SupplierDeleteUsecase(supplierRepo),
  };
};

describe('SupplierListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<SupplierListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show supplier list after successful fetch', async () => {
      render(<SupplierListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Supplier 1' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Supplier 2' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const supplierRepo = new MockSupplierRepository();
      supplierRepo.setShouldFail(true);

      render(<SupplierListHandler {...createProps({ supplierRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Suppliers' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<SupplierListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should preserve list content during revalidation after delete', async () => {
      const user = userEvent.setup();
      render(<SupplierListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      expect(screen.queryByTestId('skeleton-list')).toBeNull();

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should show empty state when no suppliers exist', async () => {
      const supplierRepo = new MockSupplierRepository();
      supplierRepo.suppliers = [];

      render(<SupplierListHandler {...createProps({ supplierRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Supplier is Empty' })).toBeTruthy();
    });

    it('should show create CTA button in empty state', async () => {
      const supplierRepo = new MockSupplierRepository();
      supplierRepo.suppliers = [];
      render(<SupplierListHandler {...createProps({ supplierRepo })} />);
      await act(async () => {
        await flushPromises();
      });
      expect(screen.getByRole('button', { name: 'Create Supplier' })).toBeTruthy();
    });

    it('should navigate to create page when CTA button is pressed', async () => {
      const user = userEvent.setup();
      const supplierRepo = new MockSupplierRepository();
      supplierRepo.suppliers = [];
      render(<SupplierListHandler {...createProps({ supplierRepo })} />);
      await act(async () => {
        await flushPromises();
      });
      await user.click(screen.getByRole('button', { name: 'Create Supplier' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/suppliers/create');
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<SupplierListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Supplier ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<SupplierListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Supplier ?' })).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<SupplierListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Supplier ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Supplier ?' })).toBeNull();
    });

    it('should refetch supplier list after successful delete', async () => {
      const user = userEvent.setup();
      const supplierRepo = new MockSupplierRepository();
      render(<SupplierListHandler {...createProps({ supplierRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Supplier 1' })).toBeTruthy();

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Supplier ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Supplier ?' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Supplier 2' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to supplier edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<SupplierListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/suppliers/1');
    });

    it('should navigate to supplier page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<SupplierListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('heading', { name: 'Supplier 1' }));

      expect(mockRouterPush).toHaveBeenCalledWith('/suppliers/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch suppliers when retry button is pressed', async () => {
      const user = userEvent.setup();
      const supplierRepo = new MockSupplierRepository();
      supplierRepo.setShouldFail(true);

      render(<SupplierListHandler {...createProps({ supplierRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Suppliers' })).toBeTruthy();

      supplierRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Supplier 1' })).toBeTruthy();
    });
  });

  describe('search UX', () => {
    it('should not show clear button when search is empty', async () => {
      render(<SupplierListHandler {...createProps()} />);
      await act(async () => { await flushPromises(); });
      expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    });

    it('should show clear button when search input has text', async () => {
      const user = userEvent.setup();
      render(<SupplierListHandler {...createProps()} />);
      await act(async () => { await flushPromises(); });

      await user.type(screen.getByPlaceholderText('Search Suppliers by Name'), 'test');

      expect(screen.getByRole('button', { name: 'Clear search' })).toBeTruthy();
    });

    it('should hide clear button after clearing search', async () => {
      const user = userEvent.setup();
      render(<SupplierListHandler {...createProps()} />);
      await act(async () => { await flushPromises(); });

      await user.type(screen.getByPlaceholderText('Search Suppliers by Name'), 'test');
      expect(screen.getByRole('button', { name: 'Clear search' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Clear search' }));
      await act(async () => { await flushPromises(); });

      expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    });

    it('should not show search spinner when data is loaded and no changes pending', async () => {
      render(<SupplierListHandler {...createProps()} />);
      await act(async () => { await flushPromises(); });
      expect(screen.queryByTestId('search-spinner')).toBeNull();
    });
  });
});
