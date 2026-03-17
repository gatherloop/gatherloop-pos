import { renderHook, act } from '@testing-library/react';
import { useProductCreateController } from './ProductCreateController';
import {
  MockProductRepository,
  MockCategoryRepository,
} from '../../data/mock';
import { ProductCreateUsecase } from '../../domain';

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createUsecase = (preloadedCategories = false) => {
  const productRepo = new MockProductRepository();
  const categoryRepo = new MockCategoryRepository();
  return {
    usecase: new ProductCreateUsecase(productRepo, categoryRepo, {
      categories: preloadedCategories ? categoryRepo.categories : [],
    }),
    productRepo,
    categoryRepo,
  };
};

describe('useProductCreateController', () => {
  beforeEach(() => {
    mockToastShow.mockClear();
  });

  it('should return state, dispatch, and form', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductCreateController(usecase));

    expect(result.current.state).toBeDefined();
    expect(typeof result.current.dispatch).toBe('function');
    expect(result.current.form).toBeDefined();
  });

  it('should start in loading state when no categories preloaded', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductCreateController(usecase));

    expect(result.current.state.type).toBe('loading');
  });

  it('should start in loaded state when categories are preloaded', () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useProductCreateController(usecase));

    expect(result.current.state.type).toBe('loaded');
  });

  it('should transition to loaded state after fetching categories', async () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductCreateController(usecase));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
  });

  it('should transition to error state when category fetch fails', async () => {
    const { usecase, categoryRepo } = createUsecase();
    categoryRepo.setShouldFail(true);

    const { result } = renderHook(() => useProductCreateController(usecase));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('error');
  });

  it('should initialize form with empty default values', () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useProductCreateController(usecase));

    const formValues = result.current.form.getValues();
    expect(formValues.name).toBe('');
    expect(formValues.imageUrl).toBe('');
    expect(formValues.description).toBe('');
    expect(formValues.saleType).toBe('purchase');
    expect(formValues.options).toEqual([]);
  });

  it('should transition to submitting when SUBMIT dispatched', async () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useProductCreateController(usecase));

    const validForm = {
      name: 'New Product',
      categoryId: 1,
      imageUrl: 'https://example.com/image.jpg',
      description: 'A product description',
      saleType: 'purchase' as const,
      options: [{ name: 'Size', values: [{ name: 'S' }] }],
    };

    act(() => {
      result.current.dispatch({ type: 'SUBMIT', values: validForm });
    });

    expect(result.current.state.type).toBe('submitting');
  });

  it('should show success toast after successful submit', async () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useProductCreateController(usecase));

    const validForm = {
      name: 'New Product',
      categoryId: 1,
      imageUrl: 'https://example.com/image.jpg',
      description: '',
      saleType: 'purchase' as const,
      options: [{ name: 'Size', values: [{ name: 'S' }] }],
    };

    act(() => {
      result.current.dispatch({ type: 'SUBMIT', values: validForm });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockToastShow).toHaveBeenCalledWith('Create Product Success');
  });

  it('should show error toast when submit fails', async () => {
    const { usecase, productRepo } = createUsecase(true);
    productRepo.setShouldFail(true);

    const { result } = renderHook(() => useProductCreateController(usecase));

    const validForm = {
      name: 'New Product',
      categoryId: 1,
      imageUrl: 'https://example.com/image.jpg',
      description: '',
      saleType: 'purchase' as const,
      options: [],
    };

    act(() => {
      result.current.dispatch({ type: 'SUBMIT', values: validForm });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockToastShow).toHaveBeenCalledWith('Create Product Error');
  });

  it('should add new product to repository after successful create', async () => {
    const { usecase, productRepo } = createUsecase(true);
    const initialCount = productRepo.products.length;

    const { result } = renderHook(() => useProductCreateController(usecase));

    const validForm = {
      name: 'Brand New Product',
      categoryId: 1,
      imageUrl: 'https://example.com/new.jpg',
      description: '',
      saleType: 'purchase' as const,
      options: [],
    };

    act(() => {
      result.current.dispatch({ type: 'SUBMIT', values: validForm });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(productRepo.products).toHaveLength(initialCount + 1);
    const newProduct = productRepo.products.find(
      (p) => p.name === 'Brand New Product'
    );
    expect(newProduct).toBeDefined();
  });
});
