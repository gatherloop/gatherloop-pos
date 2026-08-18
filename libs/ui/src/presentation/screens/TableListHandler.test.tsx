import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TableListHandler } from './TableListHandler';
import { MockAuthRepository, MockTableRepository } from '../../data/mock';
import {
  AuthLogoutUsecase,
  TableDeleteUsecase,
  TableListUsecase,
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
    tableRepo?: MockTableRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const tableRepo = options.tableRepo ?? new MockTableRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    tableListUsecase: new TableListUsecase(tableRepo, { tables: [] }),
    tableDeleteUsecase: new TableDeleteUsecase(tableRepo),
  };
};

describe('TableListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<TableListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show table list after successful fetch', async () => {
      render(<TableListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Meja 01' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Meja 02' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const tableRepo = new MockTableRepository();
      tableRepo.setShouldFail(true);

      render(<TableListHandler {...createProps({ tableRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Tables' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<TableListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should preserve list content during revalidation after delete', async () => {
      const user = userEvent.setup();
      render(<TableListHandler {...createProps()} />);

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

    it('should show empty state when no tables exist', async () => {
      const tableRepo = new MockTableRepository();
      tableRepo.tables = [];

      render(<TableListHandler {...createProps({ tableRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Table is Empty' })).toBeTruthy();
    });

    it('should show create CTA button in empty state', async () => {
      const tableRepo = new MockTableRepository();
      tableRepo.tables = [];
      render(<TableListHandler {...createProps({ tableRepo })} />);
      await act(async () => {
        await flushPromises();
      });
      expect(screen.getByRole('button', { name: 'Create Table' })).toBeTruthy();
    });

    it('should navigate to create page when CTA button is pressed', async () => {
      const user = userEvent.setup();
      const tableRepo = new MockTableRepository();
      tableRepo.tables = [];
      render(<TableListHandler {...createProps({ tableRepo })} />);
      await act(async () => {
        await flushPromises();
      });
      await user.click(screen.getByRole('button', { name: 'Create Table' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/tables/create');
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<TableListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Table ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<TableListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Table ?' })).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<TableListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Table ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Table ?' })).toBeNull();
    });

    it('should refetch table list after successful delete', async () => {
      const user = userEvent.setup();
      const tableRepo = new MockTableRepository();
      render(<TableListHandler {...createProps({ tableRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Meja 01' })).toBeTruthy();

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Table ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Table ?' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Meja 02' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to table edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<TableListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/tables/1');
    });

    it('should navigate to table page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<TableListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('heading', { name: 'Meja 01' }));

      expect(mockRouterPush).toHaveBeenCalledWith('/tables/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch tables when retry button is pressed', async () => {
      const user = userEvent.setup();
      const tableRepo = new MockTableRepository();
      tableRepo.setShouldFail(true);

      render(<TableListHandler {...createProps({ tableRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Tables' })).toBeTruthy();

      tableRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Meja 01' })).toBeTruthy();
    });
  });
});
