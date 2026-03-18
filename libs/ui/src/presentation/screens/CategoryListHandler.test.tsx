import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
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
    it('should show loading state initially', () => {
      const { getByText } = render(<CategoryListHandler {...createProps()} />);
      expect(getByText('Fetching Categories...')).toBeTruthy();
    });

    it('should show category list after successful fetch', async () => {
      const { getByText } = render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(getByText('Mock Category 1')).toBeTruthy();
      expect(getByText('Mock Category 2')).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.setShouldFail(true);

      const { getByText } = render(<CategoryListHandler {...createProps({ categoryRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(getByText('Failed to Fetch Categories')).toBeTruthy();
    });

    it('should show empty state when no categories exist', async () => {
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.categories = [];

      const { getByText } = render(<CategoryListHandler {...createProps({ categoryRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(getByText('Oops, Category is Empty')).toBeTruthy();
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      const { queryByText } = render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(queryByText('Delete Category ?')).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const { getAllByText, getByText } = render(
        <CategoryListHandler {...createProps()} />
      );

      await act(async () => {
        await flushPromises();
      });

      // Click the "Delete" menu item for the first category
      const deleteMenuItems = getAllByText('Delete');
      fireEvent.click(deleteMenuItems[0]);

      expect(getByText('Delete Category ?')).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const { getAllByText, getByText, queryByText } = render(
        <CategoryListHandler {...createProps()} />
      );

      await act(async () => {
        await flushPromises();
      });

      // Open the delete modal
      const deleteMenuItems = getAllByText('Delete');
      fireEvent.click(deleteMenuItems[0]);
      expect(getByText('Delete Category ?')).toBeTruthy();

      // Cancel the deletion
      fireEvent.click(getByText('No'));

      await act(async () => {
        await flushPromises();
      });

      expect(queryByText('Delete Category ?')).toBeNull();
    });

    it('should refetch category list after successful delete', async () => {
      const categoryRepo = new MockCategoryRepository();
      const { getAllByText, getByText, queryByText } = render(
        <CategoryListHandler {...createProps({ categoryRepo })} />
      );

      await act(async () => {
        await flushPromises();
      });

      // Verify both categories are shown
      expect(getByText('Mock Category 1')).toBeTruthy();

      // Open delete modal and confirm
      const deleteMenuItems = getAllByText('Delete');
      fireEvent.click(deleteMenuItems[0]);
      expect(getByText('Delete Category ?')).toBeTruthy();

      fireEvent.click(getByText('Yes'));

      await act(async () => {
        await flushPromises();
      });

      // Modal should be gone after delete completes
      expect(queryByText('Delete Category ?')).toBeNull();
      // Remaining categories are still displayed
      expect(getByText('Mock Category 2')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to category edit page when edit menu is pressed', async () => {
      const { getAllByText } = render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = getAllByText('Edit');
      fireEvent.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/categories/1');
    });

    it('should navigate to category page when item is pressed', async () => {
      const { getAllByText } = render(<CategoryListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // Click on category name which is inside the XStack list item
      const categoryItems = getAllByText('Mock Category 1');
      fireEvent.click(categoryItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/categories/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch categories when retry button is pressed', async () => {
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.setShouldFail(true);

      const { getByText } = render(<CategoryListHandler {...createProps({ categoryRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(getByText('Failed to Fetch Categories')).toBeTruthy();

      // Fix the repo so fetch succeeds on retry
      categoryRepo.setShouldFail(false);

      fireEvent.click(getByText('Retry'));

      await act(async () => {
        await flushPromises();
      });

      expect(getByText('Mock Category 1')).toBeTruthy();
    });
  });
});
