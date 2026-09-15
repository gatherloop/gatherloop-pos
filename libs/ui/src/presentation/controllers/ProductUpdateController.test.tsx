import { renderHook, act } from '@testing-library/react';
import { useProductUpdateController } from './ProductUpdateController';
import {
  MockCategoryRepository,
  MockProductRepository,
  MockVariantRepository,
} from '../../data/mock';
import { ProductUpdateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

describe('useProductUpdateController', () => {
  it('keeps an in-progress name edit when a background refetch completes mid-edit', async () => {
    const productRepo = new MockProductRepository();
    const categoryRepo = new MockCategoryRepository();
    const variantRepo = new MockVariantRepository();
    const preloadedProduct = productRepo.products.find((p) => p.id === 1) ?? null;

    const usecase = new ProductUpdateUsecase(productRepo, categoryRepo, variantRepo, {
      productId: 1,
      product: preloadedProduct,
      categories: categoryRepo.categories,
      variants: [],
    });

    const { result } = renderHook(() => useProductUpdateController(usecase));

    expect(result.current.state.type).toBe('loaded');
    expect(result.current.form.getValues('name')).toBe('Product 1');

    // user starts editing the name field
    act(() => {
      result.current.form.setValue('name', 'My Typed Name');
    });
    expect(result.current.form.getValues('name')).toBe('My Typed Name');

    // something else (e.g. deleting a variant, see ProductUpdateHandler's
    // `deletingSuccess` effect) triggers a background refetch mid-edit
    act(() => {
      result.current.dispatch({ type: 'FETCH' });
    });
    expect(result.current.state.type).toBe('loading');

    await act(async () => {
      await flushPromises();
    });
    expect(result.current.state.type).toBe('loaded');

    // the refetch must not clobber values the user already typed
    expect(result.current.form.getValues('name')).toBe('My Typed Name');
  });
});
