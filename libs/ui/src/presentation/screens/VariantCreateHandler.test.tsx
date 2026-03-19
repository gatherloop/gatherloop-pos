import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariantCreateHandler } from './VariantCreateHandler';
import {
  MockAuthRepository,
  MockMaterialRepository,
  MockMaterialListQueryRepository,
  MockProductRepository,
  MockVariantRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  MaterialListUsecase,
  VariantCreateUsecase,
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
    variantShouldFail?: boolean;
    productShouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const productId = options.productId ?? 1;
  const variantRepo = new MockVariantRepository();
  const productRepo = new MockProductRepository();
  const materialRepo = new MockMaterialRepository();

  if (options.variantShouldFail) variantRepo.setShouldFail(true);
  if (options.productShouldFail) productRepo.setShouldFail(true);

  const preloadedProduct = options.preloaded
    ? productRepo.products.find((p) => p.id === productId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    variantCreateUsecase: new VariantCreateUsecase(variantRepo, productRepo, {
      productId,
      product: preloadedProduct,
    }),
    materialListUsecase: new MaterialListUsecase(
      materialRepo,
      new MockMaterialListQueryRepository(),
      { materials: [], totalItem: 0 }
    ),
  };
};

describe('VariantCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching product', async () => {
      render(<VariantCreateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Variant...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after product is fetched', async () => {
      render(<VariantCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should show error state when product fetch fails', async () => {
      render(<VariantCreateHandler {...createProps({ productShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Variant' })).toBeTruthy();
    });

    it('should render the form immediately when product is preloaded', async () => {
      render(<VariantCreateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });
  });

  describe('form fields', () => {
    it('should render the name input field', async () => {
      render(<VariantCreateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<VariantCreateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });

    it('should not navigate when validation fails', async () => {
      const user = userEvent.setup();
      render(<VariantCreateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when creation fails', async () => {
      const user = userEvent.setup();
      const productId = 1;
      const productRepo = new MockProductRepository();
      const variantRepo = new MockVariantRepository();
      const materialRepo = new MockMaterialRepository();
      // Use product with no options so the values[] array stays empty and passes z.array() validation
      const preloadedProduct = { ...productRepo.products[0], options: [] };

      const variantCreateUsecase = new VariantCreateUsecase(
        variantRepo,
        productRepo,
        { productId, product: preloadedProduct }
      );
      variantRepo.setShouldFail(true);

      render(
        <VariantCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          variantCreateUsecase={variantCreateUsecase}
          materialListUsecase={new MaterialListUsecase(
            materialRepo,
            new MockMaterialListQueryRepository(),
            { materials: materialRepo.materials, totalItem: materialRepo.materials.length }
          )}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Variant');
      await user.type(screen.getByRole('textbox', { name: 'Price' }), '100');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Variant Error');
    });
  });

  describe('error recovery', () => {
    it('should refetch product when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const productRepo = new MockProductRepository();
      productRepo.setShouldFail(true);

      render(
        <VariantCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          variantCreateUsecase={new VariantCreateUsecase(
            new MockVariantRepository(),
            productRepo,
            { productId: 1, product: null }
          )}
          materialListUsecase={new MaterialListUsecase(
            new MockMaterialRepository(),
            new MockMaterialListQueryRepository(),
            { materials: [], totalItem: 0 }
          )}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Variant' })).toBeTruthy();

      productRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
