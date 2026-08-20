import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartItemEdit } from './CartItemEdit';
import { MockCartRepository } from '../data/mock';
import { CartUsecase } from '../domain';
import { Controller } from '../presentation/controllers/controller';
import { useController } from '../presentation/controllers/controller';
import { CartAction, CartState } from '../domain/usecases/cart';
import { NavigationProvider } from '../presentation/navigation';
import { flushPromises } from '../utils/testUtils';

const mockBack = jest.fn();

// `CartItemEdit` reads the app-wide cart via `useCart()` (D14) rather than
// taking it as a prop, so the test doubles that context binding rather than
// `CartProvider` itself — `CartProvider` hardcodes `ApiCartRepository`,
// which a unit test has no business calling.
let controllerRef: Controller<CartState, CartAction> | null = null;

jest.mock('./CartProvider', () => ({
  useCart: () => controllerRef,
}));

const TestHarness = ({
  usecase,
  cartItemId,
}: {
  usecase: CartUsecase;
  cartItemId: number;
}) => {
  const cart = useController(usecase);
  controllerRef = cart;
  return <CartItemEdit cartItemId={cartItemId} />;
};

const renderComponent = async (
  repository: MockCartRepository,
  cartItemId = 1
) => {
  const usecase = new CartUsecase(repository);
  const result = render(
    <NavigationProvider
      value={{ push: jest.fn(), replace: jest.fn(), back: mockBack }}
    >
      <TestHarness usecase={usecase} cartItemId={cartItemId} />
    </NavigationProvider>
  );

  await act(async () => {
    await flushPromises();
  });

  return result;
};

describe('CartItemEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    controllerRef = null;
  });

  it('seeds the modal from the cart line', async () => {
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 2, note: 'less sugar' });
    await renderComponent(repository);

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Regular')).toBeTruthy();
    expect(
      (screen.getByPlaceholderText(
        'Contoh: less sugar, tanpa es'
      ) as HTMLTextAreaElement).value
    ).toBe('less sugar');
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('Simpan dispatches UPDATE_ITEM with the edited amount and note, and returns to the cart', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 2, note: 'less sugar' });
    await renderComponent(repository);

    const noteInput = screen.getByPlaceholderText('Contoh: less sugar, tanpa es');
    await user.click(screen.getByLabelText('Tambah jumlah'));
    await user.clear(noteInput);
    await user.type(noteInput, 'tanpa es');

    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(repository.cart.items[0]).toMatchObject({
      amount: 3,
      note: 'tanpa es',
    });
    expect(mockBack).toHaveBeenCalled();

    await act(async () => {
      await flushPromises();
    });
  });

  it('closing without saving dispatches nothing', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 2, note: 'less sugar' });
    await renderComponent(repository);

    await user.click(screen.getByLabelText('Tutup'));

    expect(repository.cart.items[0]).toMatchObject({
      amount: 2,
      note: 'less sugar',
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it('renders nothing for an unknown cartItemId', async () => {
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 1, note: '' });
    const { container } = await renderComponent(repository, 999);

    expect(container.innerHTML).toBe('');
  });
});
