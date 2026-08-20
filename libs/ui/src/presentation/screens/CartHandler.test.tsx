import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartHandler } from './CartHandler';
import { MockCartRepository } from '../../data/mock';
import { CartUsecase } from '../../domain';
import { useController } from '../controllers/controller';
import { NavigationProvider } from '../navigation';
import { flushPromises } from '../../utils/testUtils';

const mockPush = jest.fn();

const TestCartHandler = ({
  usecase,
  tableCode = 'ABCDE12345',
}: {
  usecase: CartUsecase;
  tableCode?: string;
}) => {
  const cart = useController(usecase);
  return <CartHandler cart={cart} tableCode={tableCode} />;
};

const renderHandler = (
  repository = new MockCartRepository(),
  tableCode?: string
) => {
  const usecase = new CartUsecase(repository);
  return {
    repository,
    ...render(
      <NavigationProvider
        value={{ push: mockPush, replace: jest.fn(), back: jest.fn() }}
      >
        <TestCartHandler usecase={usecase} tableCode={tableCode} />
      </NavigationProvider>
    ),
  };
};

describe('CartHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while the cart is loading', async () => {
    renderHandler();
    expect(screen.getByText('Memuat keranjang...')).toBeTruthy();
    await act(async () => {
      await flushPromises();
    });
  });

  it('shows the empty state with no items', async () => {
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });

  it('lists cart lines once items exist, with option, note and subtotal', async () => {
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 2, note: 'less sugar' });
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Regular')).toBeTruthy();
    expect(screen.getByText('Catatan: less sugar')).toBeTruthy();
    // The single line's subtotal and the cart's total coincide (one line),
    // so both render "Rp 36.000" — one for the line, one for the summary.
    expect(screen.getAllByText('Rp 36.000')).toHaveLength(2);
  });

  it('increments quantity via the stepper, showing the optimistic subtotal immediately', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByLabelText('Tambah jumlah'));

    // Optimistic: both the line subtotal and the cart total update
    // immediately, before the mock repository's promise resolves.
    expect(screen.getAllByText('Rp 36.000')).toHaveLength(2);

    await act(async () => {
      await flushPromises();
    });
  });

  it('removes a line item', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    await user.click(
      screen.getByLabelText('Hapus Es Kopi Susu dari keranjang')
    );

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });

  it('pressing "Kosongkan" opens the confirmation dialog without clearing the cart', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    await user.click(
      screen.getByRole('button', { name: 'Kosongkan keranjang' })
    );

    expect(screen.getByText('Kosongkan keranjang?')).toBeTruthy();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('cancelling the confirmation dialog leaves the cart untouched', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    await user.click(
      screen.getByRole('button', { name: 'Kosongkan keranjang' })
    );
    await user.click(screen.getByRole('button', { name: 'Batal' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.queryByText('Kosongkan keranjang?')).toBeNull();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('confirming the dialog clears the cart', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    await user.click(
      screen.getByRole('button', { name: 'Kosongkan keranjang' })
    );
    await user.click(screen.getByRole('button', { name: 'Kosongkan' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });

  it('navigates to the menu when "add more items" is pressed', async () => {
    const user = userEvent.setup();
    renderHandler(new MockCartRepository(), 'ABCDE12345');

    await act(async () => {
      await flushPromises();
    });

    await user.click(
      screen.getByRole('button', { name: 'Tambah menu lainnya' })
    );

    expect(mockPush).toHaveBeenCalledWith('/t/ABCDE12345');
  });

  it('navigates to checkout when the checkout button is pressed', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    await repository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler(repository, 'ABCDE12345');

    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByRole('button', { name: /^Checkout/ }));

    expect(mockPush).toHaveBeenCalledWith('/t/ABCDE12345/checkout');
  });

  it('shows a retryable error state, and recovers on retry', async () => {
    const user = userEvent.setup();
    const repository = new MockCartRepository();
    repository.setShouldFail(true);
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Gagal memuat keranjang')).toBeTruthy();

    repository.setShouldFail(false);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });
});
