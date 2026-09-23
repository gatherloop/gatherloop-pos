import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartHandler } from './CartHandler';
import {
  MockCartQueryRepository,
  MockCartRepository,
  MockPaymentRepository,
  MockPublicTableRepository,
  MockSessionRepository,
} from '../../../data/mock';
import {
  CartUsecase,
  CheckoutUsecase,
  TableResolveUsecase,
} from '../../../domain';
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
  enabled = true,
  isCashPaymentEnabled = false,
  cashierLocation,
  cartRepository = new MockCartRepository(),
  paymentRepository = new MockPaymentRepository(),
  tableRepository = new MockPublicTableRepository(),
  cartQueryRepository = new MockCartQueryRepository(),
  sessionRepository = new MockSessionRepository(),
  customerName = '',
  preparingCount,
}: {
  enabled?: boolean;
  isCashPaymentEnabled?: boolean;
  cashierLocation?: string;
  cartRepository?: MockCartRepository;
  paymentRepository?: MockPaymentRepository;
  tableRepository?: MockPublicTableRepository;
  cartQueryRepository?: MockCartQueryRepository;
  sessionRepository?: MockSessionRepository;
  customerName?: string;
  preparingCount?: number;
} = {}) => {
  const tableResolveUsecase = new TableResolveUsecase(tableRepository, {
    code: TABLE_CODE,
  });
  const cartUsecase = new CartUsecase(cartRepository, cartQueryRepository);
  const checkoutUsecase = new CheckoutUsecase(paymentRepository, {
    customerName,
  });

  return {
    cartRepository,
    paymentRepository,
    tableRepository,
    sessionRepository,
    ...render(
      <CartHandler
        tableResolveUsecase={tableResolveUsecase}
        cartUsecase={cartUsecase}
        checkoutUsecase={checkoutUsecase}
        sessionRepository={sessionRepository}
        enabled={enabled}
        isCashPaymentEnabled={isCashPaymentEnabled}
        cashierLocation={cashierLocation}
        tableCode={TABLE_CODE}
        preparingCount={preparingCount}
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

const addItemToCart = (cartRepository: MockCartRepository) =>
  cartRepository.addItem({ variantId: 1, amount: 1, note: '' });

const payButtonName = /^Bayar dengan QRIS/;

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

    expect(screen.getByText('Meja 01 · Lantai 1')).toBeTruthy();
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

  it('shows a disabled checkout button with a helper text when checkout is not enabled', async () => {
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({ cartRepository, enabled: false });

    await settle();

    expect(
      (screen.getByRole('button', { name: payButtonName }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.getByText('Checkout belum tersedia')).toBeTruthy();
  });

  it('disables checkout when a line is sold out, and re-enables it once the line is removed', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    await cartRepository.addItem({ variantId: 2, amount: 1, note: '' });
    cartRepository.cart = {
      ...cartRepository.cart,
      items: cartRepository.cart.items.map((item) =>
        item.variantId === 2
          ? { ...item, variant: { ...item.variant, isSellable: false } }
          : item
      ),
    };
    renderHandler({ cartRepository });

    await settle();

    expect(
      (screen.getByRole('button', { name: payButtonName }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    const removeButtons = screen.getAllByLabelText(
      'Hapus Es Kopi Susu dari keranjang'
    );
    await user.click(removeButtons[1]);
    await settle();

    expect(
      (screen.getByRole('button', { name: payButtonName }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
  });

  it('disables checkout when a line exceeds its remaining quantity', async () => {
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 3, note: '' });
    cartRepository.cart = {
      ...cartRepository.cart,
      items: cartRepository.cart.items.map((item) => ({
        ...item,
        variant: { ...item.variant, sellableQuantity: 2 },
      })),
    };
    renderHandler({ cartRepository });

    await settle();

    expect(
      (screen.getByRole('button', { name: payButtonName }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('refetches the cart after a rejected checkout', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const fetchSpy = jest.spyOn(cartRepository, 'fetchCurrentCart');
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.setShouldFailCheckout(true);
    renderHandler({
      cartRepository,
      paymentRepository,
      customerName: 'Budi',
    });
    await settle();

    fetchSpy.mockClear();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );
    await settle();

    expect(fetchSpy).toHaveBeenCalled();
  });

  it('opens the name sheet prefilled from the seeded customer name', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({ cartRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));

    expect(
      (screen.getByPlaceholderText('Nama Anda') as HTMLInputElement).value
    ).toBe('Budi');
  });

  it('holds an empty name at the sheet with an error, creating nothing', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(paymentRepository, 'checkout');
    renderHandler({ cartRepository, paymentRepository });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );

    expect(screen.getByText('Nama tidak boleh kosong')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nama Anda')).toBeTruthy();
    expect(checkoutSpy).not.toHaveBeenCalled();

    await settle();
  });

  it('cancelling the name sheet leaves the cart untouched, creating nothing', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(paymentRepository, 'checkout');
    renderHandler({ cartRepository, paymentRepository });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(screen.getByRole('button', { name: 'Batal' }));

    expect(screen.queryByPlaceholderText('Nama Anda')).toBeNull();
    expect(checkoutSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('does not render the method picker when cash payment is disabled', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({ cartRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));

    expect(
      screen.queryByLabelText('Bayar dengan Cash di Kasir')
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    ).toBeTruthy();
  });

  it('renders the method picker defaulted to QRIS when cash payment is enabled', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({
      cartRepository,
      customerName: 'Budi',
      isCashPaymentEnabled: true,
      cashierLocation: 'Lantai 2',
    });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));

    expect(
      screen.getByLabelText('Bayar dengan Cash di Kasir')
    ).toBeTruthy();
    expect(screen.getByText('Bayar tunai di kasir Lantai 2')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    ).toBeTruthy();
  });

  it('selecting cash switches the submit label and checks out with method cash', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(paymentRepository, 'checkout');
    renderHandler({
      cartRepository,
      paymentRepository,
      customerName: 'Budi',
      isCashPaymentEnabled: true,
    });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByLabelText('Bayar dengan Cash di Kasir')
    );

    expect(
      screen.getByRole('button', { name: 'Pesan & bayar di kasir' })
    ).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Pesan & bayar di kasir' })
    );
    await settle();

    expect(checkoutSpy).toHaveBeenCalledWith({
      customerName: 'Budi',
      method: 'cash',
    });
    expect(mockPush).toHaveBeenCalledWith(
      `/orders/${paymentRepository.payment.reference}`
    );
  });

  it('creates the payment and navigates to the status page once a valid name is submitted', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    renderHandler({
      cartRepository,
      paymentRepository,
      customerName: 'Budi',
    });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );
    await settle();

    expect(mockPush).toHaveBeenCalledWith(
      `/orders/${paymentRepository.payment.reference}`
    );
  });

  it('keeps the guest on the cart with a retry when the payment fails to create, succeeding on retry', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    paymentRepository.setShouldFailCheckout(true);
    renderHandler({ cartRepository, paymentRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );
    await settle();

    expect(screen.getByText('Gagal membuat pembayaran')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();

    paymentRepository.setShouldFailCheckout(false);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await settle();

    expect(mockPush).toHaveBeenCalledWith(
      `/orders/${paymentRepository.payment.reference}`
    );
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

  it('navigates to /orders from the header history button', async () => {
    const user = userEvent.setup();
    renderHandler();

    await settle();

    await user.click(screen.getByRole('button', { name: 'Pesanan Saya' }));

    expect(mockPush).toHaveBeenCalledWith('/orders');
  });

  it('shows the preparing count badge on the history button when provided', async () => {
    renderHandler({ preparingCount: 3 });

    await settle();

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('shows no badge when there are no preparing orders', async () => {
    renderHandler({ preparingCount: 0 });

    await settle();

    expect(screen.queryByText('0')).toBeNull();
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
