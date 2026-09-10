import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartHandler } from './CartHandler';
import {
  MockCartQueryRepository,
  MockCartRepository,
  MockPublicTableRepository,
  MockSessionRepository,
} from '../../../data/mock';
import { CartUsecase, TableResolveUsecase } from '../../../domain';
import { flushPromises } from '../../../utils/testUtils';

const mockPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const TABLE_CODE = '3F7H9K2M5P';

const renderHandler = ({
  cartRepository = new MockCartRepository(),
  tableRepository = new MockPublicTableRepository(),
  cartQueryRepository = new MockCartQueryRepository(),
}: {
  cartRepository?: MockCartRepository;
  tableRepository?: MockPublicTableRepository;
  cartQueryRepository?: MockCartQueryRepository;
} = {}) => {
  const tableResolveUsecase = new TableResolveUsecase(tableRepository, {
    code: TABLE_CODE,
  });
  const cartUsecase = new CartUsecase(cartRepository, cartQueryRepository);

  return {
    cartRepository,
    tableRepository,
    ...render(
      <CartHandler
        tableResolveUsecase={tableResolveUsecase}
        cartUsecase={cartUsecase}
        sessionRepository={new MockSessionRepository()}
        tableCode={TABLE_CODE}
      />
    ),
  };
};

const settle = async () => {
  await act(async () => {
    await flushPromises();
    await flushPromises();
  });
};

describe('CartHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the table shell while the table is resolving', async () => {
    renderHandler();
    expect(screen.getByText('Memuat meja...')).toBeTruthy();
    await settle();
  });

  it('shows an invalid-QR message for an unknown table code', async () => {
    const tableRepository = new MockPublicTableRepository();
    tableRepository.tables = {};
    renderHandler({ tableRepository });

    await settle();

    expect(screen.getByText('QR tidak valid')).toBeTruthy();
  });

  it('shows the empty state with no items', async () => {
    renderHandler();

    await settle();

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });

  it('lists cart lines once items exist, with option, note and subtotal', async () => {
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 2, note: 'less sugar' });
    renderHandler({ cartRepository });

    await settle();

    expect(screen.getByText('Meja 01')).toBeTruthy();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Regular')).toBeTruthy();
    expect(screen.getByText('Catatan: less sugar')).toBeTruthy();
    expect(screen.getAllByText('Rp 36.000')).toHaveLength(2);
  });

  it('increments quantity via the stepper, showing the optimistic subtotal immediately', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler({ cartRepository });

    await settle();

    await user.click(screen.getByLabelText('Tambah jumlah'));

    expect(screen.getAllByText('Rp 36.000')).toHaveLength(2);

    await settle();
  });

  it('removes a line item', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler({ cartRepository });

    await settle();

    await user.click(
      screen.getByLabelText('Hapus Es Kopi Susu dari keranjang')
    );

    await settle();

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });

  it('pressing "Kosongkan" opens the confirmation dialog without clearing the cart', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler({ cartRepository });

    await settle();

    await user.click(
      screen.getByRole('button', { name: 'Kosongkan keranjang' })
    );

    expect(screen.getByText('Kosongkan keranjang?')).toBeTruthy();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('cancelling the confirmation dialog leaves the cart untouched', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler({ cartRepository });

    await settle();

    await user.click(
      screen.getByRole('button', { name: 'Kosongkan keranjang' })
    );
    await user.click(screen.getByRole('button', { name: 'Batal' }));

    await settle();

    expect(screen.queryByText('Kosongkan keranjang?')).toBeNull();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('confirming the dialog clears the cart', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler({ cartRepository });

    await settle();

    await user.click(
      screen.getByRole('button', { name: 'Kosongkan keranjang' })
    );
    await user.click(screen.getByRole('button', { name: 'Kosongkan' }));

    await settle();

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });

  it('navigates to the menu when "add more items" is pressed', async () => {
    const user = userEvent.setup();
    renderHandler();

    await settle();

    await user.click(
      screen.getByRole('button', { name: 'Tambah menu lainnya' })
    );

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}`);
  });

  it('navigates to checkout when the checkout button is pressed', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    renderHandler({ cartRepository });

    await settle();

    await user.click(screen.getByRole('button', { name: /^Checkout/ }));

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}/checkout`);
  });

  it('shows a retryable error state, and recovers on retry', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    cartRepository.setShouldFail(true);
    renderHandler({ cartRepository });

    await settle();

    expect(screen.getByText('Gagal memuat keranjang')).toBeTruthy();

    cartRepository.setShouldFail(false);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await settle();

    expect(screen.getByText('Keranjang kosong')).toBeTruthy();
  });

  describe('the edit modal', () => {
    it('opens with no navigation when the edit button is pressed, seeded from the line', async () => {
      const user = userEvent.setup();
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({
        variantId: 1,
        amount: 2,
        note: 'less sugar',
      });
      renderHandler({ cartRepository });

      await settle();

      await user.click(screen.getByLabelText('Ubah Es Kopi Susu'));

      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getAllByText('Es Kopi Susu')).toHaveLength(2);
      expect(
        (screen.getByPlaceholderText(
          'Contoh: less sugar, tanpa es'
        ) as HTMLTextAreaElement).value
      ).toBe('less sugar');
      expect(screen.getAllByLabelText('Tambah jumlah')).toHaveLength(2);
    });

    it('Simpan dispatches UPDATE_ITEM with the edited amount and note, and closes the modal back to the cart', async () => {
      const user = userEvent.setup();
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({
        variantId: 1,
        amount: 2,
        note: 'less sugar',
      });
      renderHandler({ cartRepository });

      await settle();

      await user.click(screen.getByLabelText('Ubah Es Kopi Susu'));
      await settle();

      const noteInput = screen.getByPlaceholderText(
        'Contoh: less sugar, tanpa es'
      );
      const steppers = screen.getAllByLabelText('Tambah jumlah');
      await user.click(steppers[steppers.length - 1]);
      await user.clear(noteInput);
      await user.type(noteInput, 'tanpa es');

      await user.click(screen.getByRole('button', { name: 'Simpan' }));
      await settle();

      expect(cartRepository.cart.items[0]).toMatchObject({
        amount: 3,
        note: 'tanpa es',
      });
      expect(screen.queryByLabelText('Tutup')).toBeNull();
      expect(screen.getByText('Catatan: tanpa es')).toBeTruthy();
    });

    it('closing without saving dispatches nothing', async () => {
      const user = userEvent.setup();
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({
        variantId: 1,
        amount: 2,
        note: 'less sugar',
      });
      renderHandler({ cartRepository });

      await settle();

      await user.click(screen.getByLabelText('Ubah Es Kopi Susu'));
      await settle();
      await user.click(screen.getByLabelText('Tutup'));

      expect(cartRepository.cart.items[0]).toMatchObject({
        amount: 2,
        note: 'less sugar',
      });
      expect(screen.queryByLabelText('Tutup')).toBeNull();
    });

    it('deep-links open via a seeded ?item=, over the restored cart', async () => {
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({
        variantId: 1,
        amount: 1,
        note: '',
      });
      const [seededItem] = cartRepository.cart.items;
      const cartQueryRepository = new MockCartQueryRepository();
      jest
        .spyOn(cartQueryRepository, 'getSelectedItemId')
        .mockReturnValue(seededItem.id);

      renderHandler({ cartRepository, cartQueryRepository });

      await settle();

      expect(screen.getAllByText('Es Kopi Susu')).toHaveLength(2);
    });

    it('falls back to the cart with no modal for an unknown item id', async () => {
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
      const cartQueryRepository = new MockCartQueryRepository();
      jest
        .spyOn(cartQueryRepository, 'getSelectedItemId')
        .mockReturnValue(999);

      renderHandler({ cartRepository, cartQueryRepository });

      await settle();

      expect(screen.queryByLabelText('Tutup')).toBeNull();
      expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    });
  });
});
