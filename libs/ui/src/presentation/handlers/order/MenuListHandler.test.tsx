import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuListHandler } from './MenuListHandler';
import {
  MockCartQueryRepository,
  MockCartRepository,
  MockMenuListQueryRepository,
  MockMenuRepository,
  MockPublicTableRepository,
  MockSessionRepository,
} from '../../../data/mock';
import {
  CartUsecase,
  MenuItemDetailUsecase,
  MenuListParams,
  MenuListUsecase,
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

const pendingQrisPayment: PendingPayment = {
  partnerReferenceNo: 'ORDER-1',
  method: 'qris',
  amount: 45000,
  expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  canCancel: true,
};

const renderHandler = ({
  menuRepository = new MockMenuRepository(),
  tableRepository = new MockPublicTableRepository(),
  cartRepository = new MockCartRepository(),
  menuListQueryRepository = new MockMenuListQueryRepository(),
  menuListParams = { products: [], categories: [] } as MenuListParams,
  sessionRepository = new MockSessionRepository(),
  preparingCount,
}: {
  menuRepository?: MockMenuRepository;
  tableRepository?: MockPublicTableRepository;
  cartRepository?: MockCartRepository;
  menuListQueryRepository?: MockMenuListQueryRepository;
  menuListParams?: MenuListParams;
  sessionRepository?: MockSessionRepository;
  preparingCount?: number;
} = {}) => {
  const tableResolveUsecase = new TableResolveUsecase(tableRepository, {
    code: TABLE_CODE,
  });
  const menuListUsecase = new MenuListUsecase(
    menuRepository,
    menuListQueryRepository,
    menuListParams
  );
  const menuItemDetailUsecase = new MenuItemDetailUsecase(menuRepository, {
    productId: null,
  });
  const cartUsecase = new CartUsecase(
    cartRepository,
    new MockCartQueryRepository()
  );

  return {
    menuRepository,
    tableRepository,
    cartRepository,
    sessionRepository,
    ...render(
      <MenuListHandler
        tableResolveUsecase={tableResolveUsecase}
        menuListUsecase={menuListUsecase}
        menuItemDetailUsecase={menuItemDetailUsecase}
        cartUsecase={cartUsecase}
        cartRepository={cartRepository}
        sessionRepository={sessionRepository}
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

describe('MenuListHandler', () => {
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

  it('shows the business name on every screen, including before the table resolves', async () => {
    renderHandler();

    expect(screen.getAllByText('Gatherloop Board Game Cafe')).toBeTruthy();

    await settle();

    expect(screen.getByText('Gatherloop Board Game Cafe')).toBeTruthy();
  });

  it('shows every product grouped by category once the table and menu have loaded', async () => {
    renderHandler();

    await settle();

    expect(screen.getByText('Meja 01 · Lantai 1')).toBeTruthy();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Nasi Goreng')).toBeTruthy();
    expect(screen.getAllByText('Minuman')).toHaveLength(2);
    expect(screen.getAllByText('Makanan')).toHaveLength(2);
  });

  it('attaches the resolved table to the cart', async () => {
    const cartRepository = new MockCartRepository();
    const updateTableSpy = jest.spyOn(cartRepository, 'updateTable');
    renderHandler({ cartRepository });

    await settle();

    expect(updateTableSpy).toHaveBeenCalledWith(TABLE_CODE);
  });

  it('shows the lowest variant price as a starting price', async () => {
    renderHandler();

    await settle();

    expect(screen.getByText('Rp 18.000')).toBeTruthy();
    expect(screen.getByText('Rp 25.000')).toBeTruthy();
  });

  it('shows an error state when the menu fetch fails, and recovers on retry', async () => {
    const user = userEvent.setup();
    const menuRepository = new MockMenuRepository();
    menuRepository.setShouldFail(true);
    renderHandler({ menuRepository });

    await settle();

    expect(screen.getByText('Gagal memuat menu')).toBeTruthy();

    menuRepository.setShouldFail(false);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await settle();

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('filters to a single category when its chip is pressed', async () => {
    const user = userEvent.setup();
    renderHandler();

    await settle();

    await user.click(screen.getByRole('button', { name: 'Makanan' }));

    await settle();

    expect(screen.getByText('Nasi Goreng')).toBeTruthy();
    expect(screen.queryByText('Es Kopi Susu')).toBeNull();
  });

  it('reflects typed text in the search input', async () => {
    const user = userEvent.setup();
    renderHandler();

    await settle();

    const input = screen.getByPlaceholderText<HTMLInputElement>(
      'Cari menu atau varian'
    );
    await user.type(input, 'kopi');

    expect(input.value).toBe('kopi');
  });

  it('shows a matched-value chip and hides non-matching products when searching by option value', async () => {
    const user = userEvent.setup();
    renderHandler();

    await settle();

    const input = screen.getByPlaceholderText<HTMLInputElement>(
      'Cari menu atau varian'
    );
    await user.type(input, 'large');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650));
    });
    await settle();

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Large')).toBeTruthy();
    expect(screen.queryByText('Nasi Goreng')).toBeNull();
  });

  it('shows the cart bar once the cart is non-empty, and navigates to the cart route on press', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 2, note: '' });
    renderHandler({ cartRepository });

    await settle();

    await user.click(screen.getByText(/2 item/));

    expect(mockPush).toHaveBeenCalledWith(`/t/${TABLE_CODE}/cart`);
  });

  it('shows no cart bar while the cart is empty', async () => {
    renderHandler();

    await settle();

    expect(screen.queryByText(/Lihat Keranjang/)).toBeNull();
  });

  it('shows the pending-payment bar instead of the cart bar while the cart is locked, continuing to the countdown on press', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    await cartRepository.addItem({ variantId: 1, amount: 2, note: '' });
    cartRepository.setPendingPayment(pendingQrisPayment);
    renderHandler({ cartRepository });

    await settle();

    expect(
      screen.getByText(/Menunggu pembayaran QRIS · Rp 45.000/)
    ).toBeTruthy();
    expect(screen.queryByText(/Lihat Keranjang/)).toBeNull();

    await user.click(
      screen.getByRole('button', { name: 'Lanjutkan pembayaran' })
    );

    expect(mockPush).toHaveBeenCalledWith('/orders/ORDER-1');
  });

  it('shows a red banner when a cart write fails for a reason other than a pending-payment lock (D23)', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    renderHandler({ cartRepository });
    await settle();

    await user.click(screen.getByText('Es Kopi Susu'));
    await settle();
    await user.click(screen.getByRole('button', { name: 'Regular' }));
    await settle();

    jest
      .spyOn(cartRepository, 'addItem')
      .mockRejectedValueOnce(new Error('Failed to add item'));
    await user.click(
      screen.getByRole('button', { name: 'Tambah ke Keranjang · Rp 18.000' })
    );
    await settle();

    expect(
      screen.getByText('Gagal memperbarui keranjang. Silakan coba lagi.')
    ).toBeTruthy();
  });

  it('navigates to /orders from the header history button', async () => {
    const user = userEvent.setup();
    renderHandler();

    await settle();

    await user.click(screen.getByRole('button', { name: 'Pesanan Saya' }));

    expect(mockPush).toHaveBeenCalledWith('/orders');
  });

  it('shows the preparing count badge on the history button when provided', async () => {
    renderHandler({ preparingCount: 2 });

    await settle();

    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows no badge when there are no preparing orders', async () => {
    renderHandler({ preparingCount: 0 });

    await settle();

    expect(screen.queryByText('0')).toBeNull();
  });

  describe('the item sheet', () => {
    it('opens with no network request when a product card is pressed, and does not remount the menu', async () => {
      const user = userEvent.setup();
      const menuRepository = new MockMenuRepository();
      const fetchProductSpy = jest.spyOn(menuRepository, 'fetchProductById');
      renderHandler({ menuRepository });

      await settle();
      const input = screen.getByPlaceholderText<HTMLInputElement>(
        'Cari menu atau varian'
      );
      await user.type(input, 'kopi');

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      expect(fetchProductSpy).not.toHaveBeenCalled();
      expect(screen.getByText('Regular')).toBeTruthy();
      expect(screen.getByText('Large')).toBeTruthy();
      expect(input.value).toBe('kopi');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('preselects the option value an unambiguous search match found, skipping straight to a resolved price', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      const input = screen.getByPlaceholderText<HTMLInputElement>(
        'Cari menu atau varian'
      );
      await user.type(input, 'regular');

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      expect(
        screen.getByRole('button', {
          name: 'Tambah ke Keranjang · Rp 18.000',
        })
      ).toBeTruthy();
    });

    it('preselects nothing when the search match is ambiguous within an option', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      const input = screen.getByPlaceholderText<HTMLInputElement>(
        'Cari menu atau varian'
      );
      await user.type(input, 'e');

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      await user.click(
        screen.getByRole('button', { name: 'Tambah ke Keranjang' })
      );

      expect(screen.getByText('Pilih Ukuran dulu ya')).toBeTruthy();
    });

    it('deep-links open via a seeded selectedProductId, with no click', async () => {
      renderHandler({
        menuListParams: {
          products: [],
          categories: [],
          selectedProductId: 1,
        },
      });

      await settle();

      expect(screen.getAllByText('Es Kopi Susu')).toHaveLength(2);
      expect(screen.getByText('Regular')).toBeTruthy();
    });

    it('shows an inline validation error when the CTA is pressed while options are incomplete, then clears once selected', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      await user.click(
        screen.getByRole('button', { name: 'Tambah ke Keranjang' })
      );
      expect(screen.getByText('Pilih Ukuran dulu ya')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Regular' }));
      await settle();

      expect(screen.queryByText('Pilih Ukuran dulu ya')).toBeNull();
    });

    it('adds to cart with the resolved variant, amount and note, then closes the sheet back to the menu', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      await user.click(screen.getByRole('button', { name: 'Regular' }));
      await settle();

      await user.click(
        screen.getByRole('button', { name: 'Tambah ke Keranjang · Rp 18.000' })
      );
      await settle();

      expect(screen.queryByLabelText('Tutup')).toBeNull();
      expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
      expect(screen.getByText(/1 item/)).toBeTruthy();
    });

    it('goes straight to ready for a product with no options', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      await user.click(screen.getByText('Nasi Goreng'));
      await settle();

      expect(
        (
          screen.getByRole('button', {
            name: 'Tambah ke Keranjang · Rp 25.000',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false);
    });

    it('falls back to fetching the product directly when a deep link points at an id the menu fetch has not resolved yet, and shows an error if that also fails', async () => {
      renderHandler({
        menuListParams: {
          products: [],
          categories: [],
          selectedProductId: 999,
        },
      });

      await settle();

      expect(screen.getByText('Gagal memuat produk')).toBeTruthy();
      expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    });

    it('closes the sheet when the close button is pressed', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      await user.click(screen.getByLabelText('Tutup'));

      expect(screen.queryByLabelText('Tutup')).toBeNull();
    });

    it('shows a Habis badge on a sold-out product and blocks opening its item sheet', async () => {
      const user = userEvent.setup();
      const menuRepository = new MockMenuRepository();
      menuRepository.products = menuRepository.products.map((product) =>
        product.id === 1 ? { ...product, isSellable: false } : product
      );
      renderHandler({ menuRepository });
      await settle();

      expect(screen.getByText('Habis')).toBeTruthy();

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      expect(screen.queryByLabelText('Tutup')).toBeNull();
    });

    it('disables a sold-out option value chip and labels it Habis', async () => {
      const user = userEvent.setup();
      const menuRepository = new MockMenuRepository();
      menuRepository.variants = menuRepository.variants.map((variant) =>
        variant.id === 2 ? { ...variant, isSellable: false } : variant
      );
      renderHandler({ menuRepository });
      await settle();

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      expect(
        (
          screen.getByRole('button', {
            name: 'Large · Habis',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true);
      expect(
        (screen.getByRole('button', { name: 'Regular' }) as HTMLButtonElement)
          .disabled
      ).toBe(false);
    });

    it('shows Stok habis and disables add-to-cart for a sold-out resolved variant', async () => {
      const menuRepository = new MockMenuRepository();
      menuRepository.variants = menuRepository.variants.map((variant) =>
        variant.id === 3 ? { ...variant, isSellable: false } : variant
      );
      renderHandler({ menuRepository });
      await settle();

      const user = userEvent.setup();
      await user.click(screen.getByText('Nasi Goreng'));
      await settle();

      expect(
        (
          screen.getByRole('button', {
            name: 'Stok habis',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(true);
    });

    it('shows the pending-payment notice instead of the add-to-cart button while locked, still allowing browsing', async () => {
      const user = userEvent.setup();
      const cartRepository = new MockCartRepository();
      cartRepository.setPendingPayment(pendingQrisPayment);
      renderHandler({ cartRepository });
      await settle();

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      expect(
        screen.getByText(/pembayaran yang belum selesai/)
      ).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: /Tambah ke Keranjang/ })
      ).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Regular' }));
      await settle();

      expect(
        screen.queryByRole('button', { name: /Tambah ke Keranjang/ })
      ).toBeNull();

      const continueButtons = screen.getAllByRole('button', {
        name: 'Lanjutkan pembayaran',
      });
      expect(continueButtons).toHaveLength(2);
      await user.click(continueButtons[0]);

      expect(mockPush).toHaveBeenCalledWith('/orders/ORDER-1');
    });

    it('resets the draft when a different item is opened next', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();
      await user.click(screen.getByLabelText('Tutup'));

      await user.click(screen.getByText('Nasi Goreng'));
      await settle();

      expect(screen.getAllByText('Nasi Goreng')).toHaveLength(2);
      expect(screen.queryByText('Regular')).toBeNull();
    });
  });
});
