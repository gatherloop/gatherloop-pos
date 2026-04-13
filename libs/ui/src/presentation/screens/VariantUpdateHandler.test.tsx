import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariantUpdateHandler } from './VariantUpdateHandler';
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
  VariantUpdateUsecase,
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
    variantId?: number;
    productId?: number;
    variantShouldFail?: boolean;
    productShouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const variantId = options.variantId ?? 1;
  const productId = options.productId ?? 1;
  const variantRepo = new MockVariantRepository();
  const productRepo = new MockProductRepository();
  const materialRepo = new MockMaterialRepository();

  if (options.variantShouldFail) variantRepo.setShouldFail(true);
  if (options.productShouldFail) productRepo.setShouldFail(true);

  const preloadedVariant = options.preloaded
    ? variantRepo.variants.find((v) => v.id === variantId) ?? null
    : null;
  const preloadedProduct = options.preloaded
    ? productRepo.products.find((p) => p.id === productId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    variantUpdateUsecase: new VariantUpdateUsecase(variantRepo, productRepo, {
      variantId,
      productId,
      variant: preloadedVariant,
      product: preloadedProduct,
    }),
    materialListUsecase: new MaterialListUsecase(
      materialRepo,
      new MockMaterialListQueryRepository(),
      { materials: [], totalItem: 0 }
    ),
  };
};

describe('VariantUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching variant', async () => {
      render(<VariantUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Variant...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after variant data loads', async () => {
      render(<VariantUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when variant is preloaded', async () => {
      render(<VariantUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Variant 1')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show error state when variant fetch fails', async () => {
      render(<VariantUpdateHandler {...createProps({ variantShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Variant' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should not navigate without user interaction', async () => {
      render(<VariantUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<VariantUpdateHandler {...createProps({ preloaded: true })} />);

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
      const variantRepo = new MockVariantRepository();
      const productRepo = new MockProductRepository();
      const preloadedVariant = variantRepo.variants[0];
      // Use product with no options so the values[] array stays empty and passes z.array() validation
      const preloadedProduct = { ...productRepo.products[0], options: [] };

      const variantUpdateUsecase = new VariantUpdateUsecase(
        variantRepo,
        productRepo,
        {
          variantId: preloadedVariant.id,
          productId: preloadedProduct.id,
          variant: preloadedVariant,
          product: preloadedProduct,
        }
      );
      variantRepo.setShouldFail(true);

      const materialRepo = new MockMaterialRepository();

      render(
        <VariantUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          variantUpdateUsecase={variantUpdateUsecase}
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

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Variant');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Variant Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when update fails', async () => {
      const user = userEvent.setup();
      const variantRepo = new MockVariantRepository();
      const productRepo = new MockProductRepository();
      const preloadedVariant = variantRepo.variants[0];
      const preloadedProduct = { ...productRepo.products[0], options: [] };

      const variantUpdateUsecase = new VariantUpdateUsecase(
        variantRepo,
        productRepo,
        {
          variantId: preloadedVariant.id,
          productId: preloadedProduct.id,
          variant: preloadedVariant,
          product: preloadedProduct,
        }
      );
      variantRepo.setShouldFail(true);

      const materialRepo = new MockMaterialRepository();

      render(
        <VariantUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          variantUpdateUsecase={variantUpdateUsecase}
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

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Variant');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<VariantUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });

  describe('error recovery', () => {
    it('should refetch variant when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const variantRepo = new MockVariantRepository();
      variantRepo.setShouldFail(true);

      render(
        <VariantUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          variantUpdateUsecase={new VariantUpdateUsecase(
            variantRepo,
            new MockProductRepository(),
            { variantId: 1, productId: 1, variant: null, product: null }
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

      variantRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
