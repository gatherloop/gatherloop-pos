import { renderHook, act } from '@testing-library/react';
import { useProductDeleteController } from './ProductDeleteController';
import { MockProductRepository } from '../../data/mock';
import { ProductDeleteUsecase } from '../../domain';

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createUsecase = () => {
  const productRepo = new MockProductRepository();
  return {
    usecase: new ProductDeleteUsecase(productRepo),
    productRepo,
  };
};

describe('useProductDeleteController', () => {
  beforeEach(() => {
    mockToastShow.mockClear();
  });

  it('should return state and dispatch', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductDeleteController(usecase));

    expect(result.current.state).toBeDefined();
    expect(typeof result.current.dispatch).toBe('function');
  });

  it('should start in hidden state', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductDeleteController(usecase));

    expect(result.current.state.type).toBe('hidden');
  });

  it('should transition to shown when SHOW_CONFIRMATION dispatched', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductDeleteController(usecase));

    act(() => {
      result.current.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
    });

    expect(result.current.state.type).toBe('shown');
    if (result.current.state.type === 'shown') {
      expect(result.current.state.productId).toBe(1);
    }
  });

  it('should transition back to hidden when HIDE_CONFIRMATION dispatched', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductDeleteController(usecase));

    act(() => {
      result.current.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
    });

    expect(result.current.state.type).toBe('shown');

    act(() => {
      result.current.dispatch({ type: 'HIDE_CONFIRMATION' });
    });

    expect(result.current.state.type).toBe('hidden');
  });

  it('should transition to deleting and then deletingSuccess when DELETE dispatched', async () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductDeleteController(usecase));

    act(() => {
      result.current.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
    });

    act(() => {
      result.current.dispatch({ type: 'DELETE' });
    });

    expect(result.current.state.type).toBe('deleting');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('hidden');
  });

  it('should show success toast after successful delete', async () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductDeleteController(usecase));

    act(() => {
      result.current.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
    });

    act(() => {
      result.current.dispatch({ type: 'DELETE' });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockToastShow).toHaveBeenCalledWith('Delete Product Success');
  });

  it('should show error toast when delete fails', async () => {
    const { usecase, productRepo } = createUsecase();
    productRepo.setShouldFail(true);

    const { result } = renderHook(() => useProductDeleteController(usecase));

    act(() => {
      result.current.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
    });

    act(() => {
      result.current.dispatch({ type: 'DELETE' });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockToastShow).toHaveBeenCalledWith('Delete Product Error');
  });

  it('should remove the product after successful delete', async () => {
    const { usecase, productRepo } = createUsecase();
    const initialCount = productRepo.products.length;

    const { result } = renderHook(() => useProductDeleteController(usecase));

    act(() => {
      result.current.dispatch({ type: 'SHOW_CONFIRMATION', productId: 1 });
    });

    act(() => {
      result.current.dispatch({ type: 'DELETE' });
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(productRepo.products).toHaveLength(initialCount - 1);
    expect(productRepo.products.find((p) => p.id === 1)).toBeUndefined();
  });
});
