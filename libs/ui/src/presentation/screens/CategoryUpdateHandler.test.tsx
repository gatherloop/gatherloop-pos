import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryUpdateHandler } from './CategoryUpdateHandler';
import { MockAuthRepository, MockCategoryRepository } from '../../data/mock';
import { AuthLogoutUsecase, CategoryUpdateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (options: {
  categoryId?: number;
  shouldFail?: boolean;
  preloaded?: boolean;
} = {}) => {
  const categoryId = options.categoryId ?? 1;
  const categoryRepo = new MockCategoryRepository();
  if (options.shouldFail) categoryRepo.setShouldFail(true);

  // When preloaded=true, pass the existing category object to skip async fetch
  // and immediately start in loaded state with pre-filled form values
  const preloadedCategory = options.preloaded
    ? categoryRepo.categories.find((c) => c.id === categoryId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    categoryUpdateUsecase: new CategoryUpdateUsecase(categoryRepo, {
      categoryId,
      category: preloadedCategory,
    }),
  };
};

describe('CategoryUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching category', () => {
      render(<CategoryUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Category...')).toBeTruthy();
    });

    it('should show the form after category data loads', async () => {
      render(<CategoryUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when category is preloaded', () => {
      render(<CategoryUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Mock Category 1')).toBeTruthy();
    });

    it('should show error state when category fetch fails', async () => {
      render(<CategoryUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Category' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/categories" after successful update', async () => {
      const user = userEvent.setup();
      render(<CategoryUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Category');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/categories');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const categoryRepo = new MockCategoryRepository();
      // Allow fetch to succeed but fail on update
      const preloadedCategory = categoryRepo.categories[0];
      const categoryUpdateUsecase = new CategoryUpdateUsecase(categoryRepo, {
        categoryId: preloadedCategory.id,
        category: preloadedCategory,
      });
      // Set shouldFail after usecase is created (affects updateCategory)
      categoryRepo.setShouldFail(true);

      render(
        <CategoryUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          categoryUpdateUsecase={categoryUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Category');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<CategoryUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<CategoryUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when update fails', async () => {
      const user = userEvent.setup();
      const categoryRepo = new MockCategoryRepository();
      const preloadedCategory = categoryRepo.categories[0];
      const categoryUpdateUsecase = new CategoryUpdateUsecase(categoryRepo, {
        categoryId: preloadedCategory.id,
        category: preloadedCategory,
      });
      categoryRepo.setShouldFail(true);

      render(
        <CategoryUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          categoryUpdateUsecase={categoryUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Category');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Category Error');
    });
  });

  describe('error recovery', () => {
    it('should refetch category when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const categoryRepo = new MockCategoryRepository();
      categoryRepo.setShouldFail(true);

      render(
        <CategoryUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          categoryUpdateUsecase={new CategoryUpdateUsecase(categoryRepo, {
            categoryId: 1,
            category: null,
          })}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Category' })).toBeTruthy();

      // Fix repo so retry succeeds
      categoryRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
