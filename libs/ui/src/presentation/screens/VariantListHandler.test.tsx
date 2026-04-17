import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariantListHandler } from './VariantListHandler';
import {
  MockAuthRepository,
  MockVariantRepository,
  MockVariantListQueryRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  VariantDeleteUsecase,
  VariantListUsecase,
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
    variantRepo?: MockVariantRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const variantRepo = options.variantRepo ?? new MockVariantRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    variantListUsecase: new VariantListUsecase(
      variantRepo,
      new MockVariantListQueryRepository(),
      { variants: [], totalItem: 0 }
    ),
    variantDeleteUsecase: new VariantDeleteUsecase(variantRepo),
  };
};

describe('VariantListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<VariantListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show variant list after successful fetch', async () => {
      render(<VariantListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // Variant list items show product name as heading — both variants have product "Product 1"
      const variantHeadings = screen.getAllByRole('heading', { name: 'Product 1' });
      expect(variantHeadings.length).toBe(2);
    });

    it('should show error state when fetch fails', async () => {
      const variantRepo = new MockVariantRepository();
      variantRepo.setShouldFail(true);

      render(<VariantListHandler {...createProps({ variantRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Variants' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<VariantListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should preserve list content during revalidation after delete', async () => {
      const user = userEvent.setup();
      render(<VariantListHandler {...createProps()} />);

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

    it('should show empty state when no variants exist', async () => {
      const variantRepo = new MockVariantRepository();
      variantRepo.variants = [];

      render(<VariantListHandler {...createProps({ variantRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Variant is Empty' })).toBeTruthy();
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<VariantListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Variant ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<VariantListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Variant ?' })).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<VariantListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Variant ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Variant ?' })).toBeNull();
    });

    it('should refetch variant list after successful delete', async () => {
      const user = userEvent.setup();
      const variantRepo = new MockVariantRepository();
      render(<VariantListHandler {...createProps({ variantRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByRole('heading', { name: 'Product 1' }).length).toBe(2);

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Variant ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Variant ?' })).toBeNull();
      expect(screen.getAllByRole('heading', { name: 'Product 1' }).length).toBe(1);
    });
  });

  describe('navigation', () => {
    it('should navigate to variant edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<VariantListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/variants/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch variants when retry button is pressed', async () => {
      const user = userEvent.setup();
      const variantRepo = new MockVariantRepository();
      variantRepo.setShouldFail(true);

      render(<VariantListHandler {...createProps({ variantRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Variants' })).toBeTruthy();

      variantRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByRole('heading', { name: 'Product 1' }).length).toBeGreaterThan(0);
    });
  });
});
