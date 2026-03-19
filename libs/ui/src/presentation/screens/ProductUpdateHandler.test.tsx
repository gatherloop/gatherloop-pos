import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductUpdateHandler } from './ProductUpdateHandler';
import {
  MockAuthRepository,
  MockCategoryRepository,
  MockProductRepository,
  MockVariantRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  ProductUpdateUsecase,
  VariantDeleteUsecase,
} from '../../domain';
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
    productId?: number;
    productShouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const productId = options.productId ?? 1;
  const productRepo = new MockProductRepository();
  const categoryRepo = new MockCategoryRepository();
  const variantRepo = new MockVariantRepository();

  if (options.productShouldFail) productRepo.setShouldFail(true);

  const preloadedProduct = options.preloaded
    ? productRepo.products.find((p) => p.id === productId) ?? null
    : null;
  const preloadedCategories = options.preloaded ? categoryRepo.categories : [];

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    productUpdateUsecase: new ProductUpdateUsecase(
      productRepo,
      categoryRepo,
      variantRepo,
      {
        productId,
        product: preloadedProduct,
        categories: preloadedCategories,
        variants: [],
      }
    ),
    variantDeleteUsecase: new VariantDeleteUsecase(variantRepo),
  };
};

describe('ProductUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching product', () => {
      render(<ProductUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Product...')).toBeTruthy();
    });

    it('should show the form after product data loads', async () => {
      render(<ProductUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when product is preloaded', () => {
      render(<ProductUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Product 1')).toBeTruthy();
    });

    it('should show error state when product fetch fails', async () => {
      render(<ProductUpdateHandler {...createProps({ productShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Product' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/products" after successful update', async () => {
      const user = userEvent.setup();
      render(<ProductUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Product');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/products');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const productRepo = new MockProductRepository();
      const categoryRepo = new MockCategoryRepository();
      const variantRepo = new MockVariantRepository();
      const preloadedProduct = productRepo.products[0];
      const preloadedCategories = categoryRepo.categories;

      const productUpdateUsecase = new ProductUpdateUsecase(
        productRepo,
        categoryRepo,
        variantRepo,
        {
          productId: preloadedProduct.id,
          product: preloadedProduct,
          categories: preloadedCategories,
          variants: [],
        }
      );
      productRepo.setShouldFail(true);

      render(
        <ProductUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          productUpdateUsecase={productUpdateUsecase}
          variantDeleteUsecase={new VariantDeleteUsecase(variantRepo)}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Product');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<ProductUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<ProductUpdateHandler {...createProps({ preloaded: true })} />);

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
      const productRepo = new MockProductRepository();
      const categoryRepo = new MockCategoryRepository();
      const variantRepo = new MockVariantRepository();
      const preloadedProduct = productRepo.products[0];

      const productUpdateUsecase = new ProductUpdateUsecase(
        productRepo,
        categoryRepo,
        variantRepo,
        {
          productId: preloadedProduct.id,
          product: preloadedProduct,
          categories: categoryRepo.categories,
          variants: [],
        }
      );
      productRepo.setShouldFail(true);

      render(
        <ProductUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          productUpdateUsecase={productUpdateUsecase}
          variantDeleteUsecase={new VariantDeleteUsecase(variantRepo)}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Product');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Product Error');
    });
  });

  describe('variant delete modal', () => {
    it('should not show variant delete modal initially', async () => {
      render(<ProductUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByRole('heading', { name: 'Delete Variant ?' })).toBeNull();
    });
  });

  describe('error recovery', () => {
    it('should refetch product when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const productRepo = new MockProductRepository();
      productRepo.setShouldFail(true);

      render(
        <ProductUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          productUpdateUsecase={new ProductUpdateUsecase(
            productRepo,
            new MockCategoryRepository(),
            new MockVariantRepository(),
            { productId: 1, product: null, categories: [], variants: [] }
          )}
          variantDeleteUsecase={new VariantDeleteUsecase(new MockVariantRepository())}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Product' })).toBeTruthy();

      productRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
