import React from 'react';
import { render, act } from '@testing-library/react';
import { ProductUpdateHandler } from './ProductUpdateHandler';
import {
  MockAuthRepository,
  MockCategoryRepository,
  MockProductRepository,
  MockVariantRepository,
} from '../../data/mock';
import { AuthLogoutUsecase, ProductUpdateUsecase, VariantDeleteUsecase } from '../../domain';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

// Mock the Screen — tests focus on handler orchestration, not form rendering
jest.mock('./ProductUpdateScreen', () => ({
  ProductUpdateScreen: () => null,
}));

const productUpdateCtrl = {
  state: {
    type: 'loaded' as string,
    errorMessage: null as string | null,
    values: { name: '', categoryId: 1, imageUrl: '', description: '', saleType: 'purchase' },
    categories: [] as never[],
    variants: [] as never[],
  },
  dispatch: jest.fn(),
  form: {} as never,
};
const variantDeleteCtrl = {
  state: { type: 'hidden' as string },
  dispatch: jest.fn(),
};
const authLogoutCtrl = {
  state: { type: 'idle' as string },
  dispatch: jest.fn(),
};

jest.mock('../controllers', () => ({
  useProductUpdateController: () => ({
    state: productUpdateCtrl.state,
    dispatch: productUpdateCtrl.dispatch,
    form: productUpdateCtrl.form,
  }),
  useVariantDeleteController: () => ({
    state: variantDeleteCtrl.state,
    dispatch: variantDeleteCtrl.dispatch,
  }),
  useAuthLogoutController: () => ({
    state: authLogoutCtrl.state,
    dispatch: authLogoutCtrl.dispatch,
  }),
}));

const createProps = () => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  productUpdateUsecase: new ProductUpdateUsecase(
    new MockProductRepository(),
    new MockCategoryRepository(),
    new MockVariantRepository(),
    { productId: 1 }
  ),
  variantDeleteUsecase: new VariantDeleteUsecase(new MockVariantRepository()),
});

describe('ProductUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    productUpdateCtrl.state = {
      type: 'loaded',
      errorMessage: null,
      values: { name: '', categoryId: 1, imageUrl: '', description: '', saleType: 'purchase' },
      categories: [],
      variants: [],
    };
    variantDeleteCtrl.state = { type: 'hidden' };
    authLogoutCtrl.state = { type: 'idle' };
  });

  describe('navigation after update success', () => {
    it('should navigate to "/products" when update succeeds', async () => {
      productUpdateCtrl.state = {
        type: 'submitSuccess',
        errorMessage: null,
        values: { name: 'Updated Product', categoryId: 1, imageUrl: '', description: '', saleType: 'purchase' },
        categories: [],
        variants: [],
      };

      await act(async () => {
        render(<ProductUpdateHandler {...createProps()} />);
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/products');
    });

    it('should not navigate when state is loaded', async () => {
      await act(async () => {
        render(<ProductUpdateHandler {...createProps()} />);
      });

      expect(mockRouterPush).not.toHaveBeenCalledWith('/products');
    });

    it('should not navigate when state is submitting', async () => {
      productUpdateCtrl.state = { ...productUpdateCtrl.state, type: 'submitting' };

      await act(async () => {
        render(<ProductUpdateHandler {...createProps()} />);
      });

      expect(mockRouterPush).not.toHaveBeenCalledWith('/products');
    });
  });

  describe('variant delete → product refetch orchestration', () => {
    it('should dispatch FETCH to product update when variant delete succeeds', async () => {
      variantDeleteCtrl.state = { type: 'deletingSuccess' };

      await act(async () => {
        render(<ProductUpdateHandler {...createProps()} />);
      });

      expect(productUpdateCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when variant delete has not succeeded', async () => {
      variantDeleteCtrl.state = { type: 'hidden' };

      await act(async () => {
        render(<ProductUpdateHandler {...createProps()} />);
      });

      expect(productUpdateCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when variant delete is still in progress', async () => {
      variantDeleteCtrl.state = { type: 'deleting' };

      await act(async () => {
        render(<ProductUpdateHandler {...createProps()} />);
      });

      expect(productUpdateCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });
});
