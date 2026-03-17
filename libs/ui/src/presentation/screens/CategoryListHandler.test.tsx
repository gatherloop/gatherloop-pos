import React from 'react';
import { render, act } from '@testing-library/react';
import { CategoryListHandler } from './CategoryListHandler';
import { MockAuthRepository, MockCategoryRepository } from '../../data/mock';
import { AuthLogoutUsecase, CategoryDeleteUsecase, CategoryListUsecase } from '../../domain';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

// Mutable state containers — closed over by the jest.mock factories
const categoryListCtrl = {
  state: { type: 'loaded' as string, categories: [] as { id: number; name: string; createdAt: string }[] },
  dispatch: jest.fn(),
};
const categoryDeleteCtrl = {
  state: { type: 'hidden' as string },
  dispatch: jest.fn(),
};
const authLogoutCtrl = {
  state: { type: 'idle' as string },
  dispatch: jest.fn(),
};

jest.mock('../controllers', () => ({
  useCategoryListController: () => ({
    state: categoryListCtrl.state,
    dispatch: categoryListCtrl.dispatch,
  }),
  useCategoryDeleteController: () => ({
    state: categoryDeleteCtrl.state,
    dispatch: categoryDeleteCtrl.dispatch,
  }),
  useAuthLogoutController: () => ({
    state: authLogoutCtrl.state,
    dispatch: authLogoutCtrl.dispatch,
  }),
}));

const createProps = () => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  categoryListUsecase: new CategoryListUsecase(new MockCategoryRepository()),
  categoryDeleteUsecase: new CategoryDeleteUsecase(new MockCategoryRepository()),
});

describe('CategoryListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    categoryListCtrl.state = { type: 'loaded', categories: [] };
    categoryDeleteCtrl.state = { type: 'hidden' };
    authLogoutCtrl.state = { type: 'idle' };
  });

  describe('delete → refetch orchestration', () => {
    it('should dispatch FETCH to category list when delete succeeds', async () => {
      categoryDeleteCtrl.state = { type: 'deletingSuccess' };

      await act(async () => {
        render(<CategoryListHandler {...createProps()} />);
      });

      expect(categoryListCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when delete state is hidden', async () => {
      categoryDeleteCtrl.state = { type: 'hidden' };

      await act(async () => {
        render(<CategoryListHandler {...createProps()} />);
      });

      expect(categoryListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when delete state is deleting (in progress)', async () => {
      categoryDeleteCtrl.state = { type: 'deleting' };

      await act(async () => {
        render(<CategoryListHandler {...createProps()} />);
      });

      expect(categoryListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });

  describe('delete modal visibility', () => {
    it('should show delete modal when state is shown', async () => {
      categoryDeleteCtrl.state = { type: 'shown' };

      const { getByText } = render(<CategoryListHandler {...createProps()} />);

      expect(getByText('Delete Category ?')).toBeTruthy();
    });

    it('should not show delete modal when state is hidden', async () => {
      categoryDeleteCtrl.state = { type: 'hidden' };

      const { queryByText } = render(<CategoryListHandler {...createProps()} />);

      expect(queryByText('Delete Category ?')).toBeNull();
    });
  });

  describe('list variant rendering', () => {
    it('should render loading state when category list is loading', () => {
      categoryListCtrl.state = { type: 'loading', categories: [] };

      const { getByText } = render(<CategoryListHandler {...createProps()} />);

      expect(getByText('Fetching Categories...')).toBeTruthy();
    });

    it('should render empty state when loaded with no categories', () => {
      categoryListCtrl.state = { type: 'loaded', categories: [] };

      const { getByText } = render(<CategoryListHandler {...createProps()} />);

      expect(getByText('Oops, Category is Empty')).toBeTruthy();
    });

    it('should render category names when loaded with data', () => {
      categoryListCtrl.state = {
        type: 'loaded',
        categories: [
          { id: 1, name: 'Beverages', createdAt: '2024-01-01' },
          { id: 2, name: 'Snacks', createdAt: '2024-01-02' },
        ],
      };

      const { getByText } = render(<CategoryListHandler {...createProps()} />);

      expect(getByText('Beverages')).toBeTruthy();
      expect(getByText('Snacks')).toBeTruthy();
    });

    it('should render error state when list fetch fails', () => {
      categoryListCtrl.state = { type: 'error', categories: [] };

      const { getByText } = render(<CategoryListHandler {...createProps()} />);

      expect(getByText('Failed to Fetch Categories')).toBeTruthy();
    });
  });
});
