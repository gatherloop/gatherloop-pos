import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryListHandler } from './CategoryListHandler';
import { MockAuthRepository, MockCategoryRepository } from '../../data/mock';
import {
  AuthLogoutUsecase,
  CategoryDeleteUsecase,
  CategoryListUsecase,
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
    categoryRepo?: MockCategoryRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const categoryRepo = options.categoryRepo ?? new MockCategoryRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    categoryListUsecase: new CategoryListUsecase(categoryRepo, { categories: [] }),
    categoryDeleteUsecase: new CategoryDeleteUsecase(categoryRepo),
  };
};

describe('CategoryListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<CategoryListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show category list after successful fetch', async () => {
      render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Mock Category 1' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Mock Category 2' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.setShouldFail(true);

      render(<CategoryListHandler {...createProps({ categoryRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Categories' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should preserve list content during revalidation after delete', async () => {
      const user = userEvent.setup();
      render(<CategoryListHandler {...createProps()} />);

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

    it('should show empty state when no categories exist', async () => {
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.categories = [];

      render(<CategoryListHandler {...createProps({ categoryRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Category is Empty' })).toBeTruthy();
    });

    it('should show create CTA button in empty state', async () => {
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.categories = [];
      render(<CategoryListHandler {...createProps({ categoryRepo })} />);
      await act(async () => { await flushPromises(); });
      expect(screen.getByRole('button', { name: 'Create Category' })).toBeTruthy();
    });

    it('should navigate to create page when CTA button is pressed', async () => {
      const user = userEvent.setup();
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.categories = [];
      render(<CategoryListHandler {...createProps({ categoryRepo })} />);
      await act(async () => { await flushPromises(); });
      await user.click(screen.getByRole('button', { name: 'Create Category' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/categories/create');
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Category ?' })).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByRole('heading', { name: 'Delete Category ?' })).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // Open the delete modal
      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Category ?' })).toBeTruthy();

      // Cancel the deletion
      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Category ?' })).toBeNull();
    });

    it('should disable Yes button and show spinner during deletion', async () => {
      const user = userEvent.setup();
      let resolveDelete!: () => void;
      const categoryRepo = new MockCategoryRepository();
      jest.spyOn(categoryRepo, 'deleteCategoryById').mockImplementation(
        () => new Promise<void>((resolve) => { resolveDelete = resolve; })
      );

      render(<CategoryListHandler {...createProps({ categoryRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      expect((screen.getByRole('button', { name: 'Yes' }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByTestId('spinner')).toBeTruthy();

      await act(async () => {
        resolveDelete();
        await flushPromises();
      });

      expect(screen.queryByTestId('spinner')).toBeNull();
    });

    it('should refetch category list after successful delete', async () => {
      const user = userEvent.setup();
      const categoryRepo = new MockCategoryRepository();
      render(<CategoryListHandler {...createProps({ categoryRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      // Verify both categories are shown
      expect(screen.getByRole('heading', { name: 'Mock Category 1' })).toBeTruthy();

      // Open delete modal and confirm
      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByRole('heading', { name: 'Delete Category ?' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      // Modal should be gone after delete completes
      expect(screen.queryByRole('heading', { name: 'Delete Category ?' })).toBeNull();
      // Remaining categories are still displayed
      expect(screen.getByRole('heading', { name: 'Mock Category 2' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to category edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/categories/1');
    });

    it('should navigate to category page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('heading', { name: 'Mock Category 1' }));

      expect(mockRouterPush).toHaveBeenCalledWith('/categories/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch categories when retry button is pressed', async () => {
      const user = userEvent.setup();
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.setShouldFail(true);

      render(<CategoryListHandler {...createProps({ categoryRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Categories' })).toBeTruthy();

      // Fix the repo so fetch succeeds on retry
      categoryRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Mock Category 1' })).toBeTruthy();
    });
  });
});
