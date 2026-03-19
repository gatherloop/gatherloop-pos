import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCreateHandler } from './ProductCreateHandler';
import {
  MockAuthRepository,
  MockCategoryRepository,
  MockProductRepository,
} from '../../data/mock';
import { AuthLogoutUsecase, ProductCreateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (
  options: {
    productShouldFail?: boolean;
    categoryShouldFail?: boolean;
    preloadCategories?: boolean;
  } = {}
) => {
  const productRepo = new MockProductRepository();
  const categoryRepo = new MockCategoryRepository();
  if (options.productShouldFail) productRepo.setShouldFail(true);
  if (options.categoryShouldFail) categoryRepo.setShouldFail(true);

  const categories = options.preloadCategories ? categoryRepo.categories : [];

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    productCreateUsecase: new ProductCreateUsecase(productRepo, categoryRepo, { categories }),
  };
};

describe('ProductCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching categories', async () => {
      render(<ProductCreateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Product...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after categories are fetched', async () => {
      render(<ProductCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should show error state when categories fetch fails', async () => {
      render(<ProductCreateHandler {...createProps({ categoryShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Product' })).toBeTruthy();
    });

    it('should render the form immediately when categories are preloaded', async () => {
      render(<ProductCreateHandler {...createProps({ preloadCategories: true })} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });
  });

  describe('form fields', () => {
    it('should render name input field', async () => {
      render(<ProductCreateHandler {...createProps({ preloadCategories: true })} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<ProductCreateHandler {...createProps({ preloadCategories: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByText('String must contain at least 1 character(s)').length).toBeGreaterThan(0);
    });

    it('should not navigate when validation fails', async () => {
      const user = userEvent.setup();
      render(<ProductCreateHandler {...createProps({ preloadCategories: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('error recovery', () => {
    it('should refetch categories when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      render(<ProductCreateHandler {...createProps({ categoryShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Product' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      // Still error because categoryShouldFail stays true
      expect(screen.getByRole('heading', { name: 'Failed to Fetch Product' })).toBeTruthy();
    });
  });
});
