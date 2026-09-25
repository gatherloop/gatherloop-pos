import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
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
  PendingPayment,
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
  customerWhatsappNumber = '',
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
  customerWhatsappNumber?: string;
  preparingCount?: number;
} = {}) => {
  const tableResolveUsecase = new TableResolveUsecase(tableRepository, {
    code: TABLE_CODE,
  });
  const cartUsecase = new CartUsecase(cartRepository, cartQueryRepository);
  const checkoutUsecase = new CheckoutUsecase(paymentRepository, {
    customerName,
    customerWhatsappNumber,
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
        paymentRepository={paymentRepository}
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

const getCancelDialog = () =>
  within(
    document.querySelector('[data-component="AlertDialog"]') as HTMLElement
  );

const addItemToCart = (cartRepository: MockCartRepository) =>
  cartRepository.addItem({ variantId: 1, amount: 1, note: '' });

const payButtonName = /^Bayar/;

const pendingQrisPayment: PendingPayment = {
  partnerReferenceNo: 'ORDER-1',
  method: 'qris',
  amount: 45000,
  expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  canCancel: true,
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
    await cartRepository.addItem({
      variantId: 1,
      amount: 2,
      note: 'less sugar',
    });
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
      customerWhatsappNumber: '081234567890',
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

  it('opens the details sheet prefilled from the seeded customer name and WhatsApp number', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({
      cartRepository,
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));

    expect(
      (screen.getByPlaceholderText('Nama Anda') as HTMLInputElement).value
    ).toBe('Budi');
    expect(
      (screen.getByPlaceholderText('0812 3456 7890') as HTMLInputElement).value
    ).toBe('081234567890');
  });

  it('shows the WhatsApp notification note while the details sheet is open', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({ cartRepository });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));

    expect(
      screen.getByText(
        'Nomor ini akan kami gunakan untuk mengabari Anda lewat WhatsApp saat pesanan siap diambil.'
      )
    ).toBeTruthy();
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
    expect(screen.getByText('Nomor WhatsApp tidak boleh kosong')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nama Anda')).toBeTruthy();
    expect(checkoutSpy).not.toHaveBeenCalled();

    await settle();
  });

  it('cancelling the details sheet leaves the cart untouched, creating nothing', async () => {
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

  it('shows the dining option picker defaulted to Makan di sini, with or without cash enabled', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({ cartRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));

    expect(screen.getByLabelText('Makan di sini')).toBeTruthy();
    expect(screen.getByLabelText('Bawa pulang')).toBeTruthy();
  });

  it('checks out with the takeaway dining option once Bawa pulang is selected', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    const checkoutSpy = jest.spyOn(paymentRepository, 'checkout');
    renderHandler({
      cartRepository,
      paymentRepository,
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(screen.getByLabelText('Bawa pulang'));
    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan ke pembayaran' })
    );
    await settle();

    expect(checkoutSpy).toHaveBeenCalledWith({
      customerName: 'Budi',
      whatsappNumber: '6281234567890',
      method: 'qris',
      diningOption: 'takeaway',
    });
  });

  it('does not render the method picker when cash payment is disabled', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    renderHandler({ cartRepository, customerName: 'Budi' });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));

    expect(screen.queryByLabelText('Bayar dengan Cash di Kasir')).toBeNull();
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

    expect(screen.getByLabelText('Bayar dengan Cash di Kasir')).toBeTruthy();
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
      customerWhatsappNumber: '081234567890',
      isCashPaymentEnabled: true,
    });
    await settle();

    await user.click(screen.getByRole('button', { name: payButtonName }));
    await user.click(screen.getByLabelText('Bayar dengan Cash di Kasir'));

    expect(
      screen.getByRole('button', { name: 'Pesan & bayar di kasir' })
    ).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Pesan & bayar di kasir' })
    );
    await settle();

    expect(checkoutSpy).toHaveBeenCalledWith({
      customerName: 'Budi',
      whatsappNumber: '6281234567890',
      method: 'cash',
      diningOption: 'dine_in',
    });
    expect(mockPush).toHaveBeenCalledWith(
      `/orders/${paymentRepository.payment.reference}`
    );
  });

  it('submits directly when the sheet opens prefilled with a valid name and WhatsApp number', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await addItemToCart(cartRepository);
    const paymentRepository = new MockPaymentRepository();
    renderHandler({
      cartRepository,
      paymentRepository,
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
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
    renderHandler({
      cartRepository,
      paymentRepository,
      customerName: 'Budi',
      customerWhatsappNumber: '081234567890',
    });
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

  it('shows the cart read-only with a continue banner when locked by a pending payment', async () => {
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    cartRepository.setPendingPayment(pendingQrisPayment);
    renderHandler({ cartRepository });

    await settle();

    expect(
      screen.queryByRole('button', { name: 'Kosongkan keranjang' })
    ).toBeNull();
    expect(screen.queryByLabelText('Ubah Es Kopi Susu')).toBeNull();
    expect(
      screen.queryByLabelText('Hapus Es Kopi Susu dari keranjang')
    ).toBeNull();
    expect(screen.queryByRole('button', { name: payButtonName })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tidak' })).toBeTruthy();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('navigates to the countdown page from the locked banner', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
    cartRepository.setPendingPayment(pendingQrisPayment);
    renderHandler({ cartRepository });

    await settle();

    await user.click(screen.getByRole('button', { name: 'Tidak' }));

    expect(mockPush).toHaveBeenCalledWith('/orders/ORDER-1');
  });

  describe('cancelling from the banner (D22)', () => {
    const seedPendingPayment = (paymentRepository: MockPaymentRepository) => {
      paymentRepository.payment = {
        ...paymentRepository.payment,
        reference: pendingQrisPayment.partnerReferenceNo,
        method: 'qris',
        status: 'pending',
        canCancel: true,
      };
    };

    it('cancels the pending payment, making the cart editable with Checkout back', async () => {
      const user = userEvent.setup();
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
      cartRepository.setPendingPayment(pendingQrisPayment);
      const paymentRepository = new MockPaymentRepository();
      seedPendingPayment(paymentRepository);
      jest
        .spyOn(paymentRepository, 'cancelPayment')
        .mockImplementation(async () => {
          cartRepository.setPendingPayment(null);
          return {
            ...paymentRepository.payment,
            status: 'cancelled',
            cancelReason: 'guest',
            canCancel: false,
          };
        });
      renderHandler({ cartRepository, paymentRepository });
      await settle();

      await user.click(
        screen.getByRole('button', { name: 'Batalkan pembayaran' })
      );
      const dialog = getCancelDialog();
      await user.click(dialog.getByRole('button', { name: 'Ya' }));
      await settle();
      await settle();

      expect(
        screen.getByRole('button', { name: 'Kosongkan keranjang' })
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: payButtonName })).toBeTruthy();
      expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    });

    it('routes to the countdown without unlocking the cart when the cancel answer is already paid', async () => {
      const user = userEvent.setup();
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
      cartRepository.setPendingPayment(pendingQrisPayment);
      const paymentRepository = new MockPaymentRepository();
      seedPendingPayment(paymentRepository);
      jest.spyOn(paymentRepository, 'cancelPayment').mockResolvedValue({
        ...paymentRepository.payment,
        status: 'paid',
        canCancel: false,
      });
      renderHandler({ cartRepository, paymentRepository });
      await settle();

      await user.click(
        screen.getByRole('button', { name: 'Batalkan pembayaran' })
      );
      const dialog = getCancelDialog();
      await user.click(dialog.getByRole('button', { name: 'Ya' }));
      await settle();

      expect(mockPush).toHaveBeenCalledWith(
        `/orders/${pendingQrisPayment.partnerReferenceNo}`
      );
    });

    it('dismissing the confirmation leaves the cart locked', async () => {
      const user = userEvent.setup();
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
      cartRepository.setPendingPayment(pendingQrisPayment);
      const paymentRepository = new MockPaymentRepository();
      seedPendingPayment(paymentRepository);
      const cancelSpy = jest.spyOn(paymentRepository, 'cancelPayment');
      renderHandler({ cartRepository, paymentRepository });
      await settle();

      await user.click(
        screen.getByRole('button', { name: 'Batalkan pembayaran' })
      );
      const dialog = getCancelDialog();
      await user.click(dialog.getByRole('button', { name: 'Tidak' }));
      await settle();

      expect(cancelSpy).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('button', { name: 'Kosongkan keranjang' })
      ).toBeNull();
    });
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
        (
          screen.getByPlaceholderText(
            'Contoh: less sugar, tanpa es'
          ) as HTMLTextAreaElement
        ).value
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

    it('shows the pending-payment notice instead of Save when the edit sheet is reached by deep link while locked', async () => {
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({
        variantId: 1,
        amount: 1,
        note: '',
      });
      const [seededItem] = cartRepository.cart.items;
      cartRepository.setPendingPayment(pendingQrisPayment);
      const cartQueryRepository = new MockCartQueryRepository();
      jest
        .spyOn(cartQueryRepository, 'getSelectedItemId')
        .mockReturnValue(seededItem.id);

      renderHandler({ cartRepository, cartQueryRepository });

      await settle();

      expect(screen.queryByRole('button', { name: 'Simpan' })).toBeNull();
      expect(screen.getAllByRole('button', { name: 'Tidak' })).toHaveLength(2);
    });

    it('cancels the pending payment from the edit sheet notice, unlocking the cart', async () => {
      const user = userEvent.setup();
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
      const [seededItem] = cartRepository.cart.items;
      cartRepository.setPendingPayment(pendingQrisPayment);
      const cartQueryRepository = new MockCartQueryRepository();
      jest
        .spyOn(cartQueryRepository, 'getSelectedItemId')
        .mockReturnValue(seededItem.id);
      const paymentRepository = new MockPaymentRepository();
      paymentRepository.payment = {
        ...paymentRepository.payment,
        reference: pendingQrisPayment.partnerReferenceNo,
        method: 'qris',
        status: 'pending',
        canCancel: true,
      };
      jest
        .spyOn(paymentRepository, 'cancelPayment')
        .mockImplementation(async () => {
          cartRepository.setPendingPayment(null);
          return {
            ...paymentRepository.payment,
            status: 'cancelled',
            cancelReason: 'guest',
            canCancel: false,
          };
        });

      renderHandler({ cartRepository, cartQueryRepository, paymentRepository });
      await settle();

      const [cancelButton] = screen.getAllByRole('button', {
        name: 'Batalkan pembayaran',
      });
      await user.click(cancelButton);
      const dialog = getCancelDialog();
      await user.click(dialog.getByRole('button', { name: 'Ya' }));
      await settle();
      await settle();

      expect(screen.getByRole('button', { name: 'Simpan' })).toBeTruthy();
    });

    it('falls back to the cart with no modal for an unknown item id', async () => {
      const cartRepository = new MockCartRepository();
      await cartRepository.addItem({ variantId: 1, amount: 1, note: '' });
      const cartQueryRepository = new MockCartQueryRepository();
      jest.spyOn(cartQueryRepository, 'getSelectedItemId').mockReturnValue(999);

      renderHandler({ cartRepository, cartQueryRepository });

      await settle();

      expect(screen.queryByLabelText('Tutup')).toBeNull();
      expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    });
  });
});
