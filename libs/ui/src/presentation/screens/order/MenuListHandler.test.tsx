import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuListHandler } from './MenuListHandler';
import {
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
  menuRepository = new MockMenuRepository(),
  tableRepository = new MockPublicTableRepository(),
  cartRepository = new MockCartRepository(),
  menuListQueryRepository = new MockMenuListQueryRepository(),
  menuListParams = { products: [], categories: [] } as MenuListParams,
}: {
  menuRepository?: MockMenuRepository;
  tableRepository?: MockPublicTableRepository;
  cartRepository?: MockCartRepository;
  menuListQueryRepository?: MockMenuListQueryRepository;
  menuListParams?: MenuListParams;
} = {}) => {
  const tableResolveUsecase = new TableResolveUsecase(tableRepository, {
    code: TABLE_CODE,
  });
  const menuListUsecase = new MenuListUsecase(
    menuRepository,
    menuListQueryRepository,
    menuListParams
  );
  // Always starts unselected, exactly like `app/order/MenuList.tsx` — the
  // handler's own effect is the sole trigger for SELECT_PRODUCT, including
  // for a seeded `menuListParams.selectedProductId` deep link (D6).
  const menuItemDetailUsecase = new MenuItemDetailUsecase(menuRepository, {
    productId: null,
  });
  const cartUsecase = new CartUsecase(cartRepository);

  return {
    menuRepository,
    tableRepository,
    cartRepository,
    ...render(
      <MenuListHandler
        tableResolveUsecase={tableResolveUsecase}
        menuListUsecase={menuListUsecase}
        menuItemDetailUsecase={menuItemDetailUsecase}
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

  it('shows every product grouped by category once the table and menu have loaded', async () => {
    renderHandler();

    await settle();

    expect(screen.getByText('Meja 01')).toBeTruthy();
    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Nasi Goreng')).toBeTruthy();
    expect(screen.getAllByText('Minuman')).toHaveLength(2);
    expect(screen.getAllByText('Makanan')).toHaveLength(2);
  });

  it('shows the lowest variant price as a starting price', async () => {
    renderHandler();

    await settle();

    expect(screen.getByText('mulai Rp 18.000')).toBeTruthy();
    expect(screen.getByText('mulai Rp 25.000')).toBeTruthy();
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

    const input = screen.getByPlaceholderText<HTMLInputElement>('Cari menu');
    await user.type(input, 'kopi');

    expect(input.value).toBe('kopi');
  });

  it('shows the cart bar once the cart is non-empty, and navigates to the cart route on press', async () => {
    const user = userEvent.setup();
    const cartRepository = new MockCartRepository();
    // Seeded before mount — the composition root's `CartUsecase` fetches
    // whatever the repository holds on its first render (D14).
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

  // D6/D9 in docs/trd-order-app-composition-and-ssr.md: opening the item
  // sheet is a state transition, not a route — no navigation, no remount of
  // the menu underneath it.
  describe('the item sheet', () => {
    it('opens with no network request when a product card is pressed, and does not remount the menu', async () => {
      const user = userEvent.setup();
      const menuRepository = new MockMenuRepository();
      const fetchProductSpy = jest.spyOn(menuRepository, 'fetchProductById');
      renderHandler({ menuRepository });

      await settle();
      const input = screen.getByPlaceholderText<HTMLInputElement>('Cari menu');
      await user.type(input, 'kopi');

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();

      expect(fetchProductSpy).not.toHaveBeenCalled();
      expect(screen.getByText('Regular')).toBeTruthy();
      expect(screen.getByText('Large')).toBeTruthy();
      // The search text survived the sheet opening over the list (parity
      // item 2) — nothing remounted `MenuListScreen`.
      expect(input.value).toBe('kopi');
      expect(mockPush).not.toHaveBeenCalled();
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

      // Renders behind the sheet too — one in the list, one in the sheet.
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

      // Sheet closed — the menu is what's left.
      expect(screen.queryByLabelText('Tutup')).toBeNull();
      expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
      // Adding a line makes the floating bar appear.
      expect(screen.getByText(/1 item/)).toBeTruthy();
    });

    it('goes straight to ready for a product with no options', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      await user.click(screen.getByText('Nasi Goreng'));
      await settle();

      expect(
        (screen.getByRole('button', {
          name: 'Tambah ke Keranjang · Rp 25.000',
        }) as HTMLButtonElement).disabled
      ).toBe(false);
    });

    it('falls back to fetching the product directly when a deep link points at an id the menu fetch has not resolved yet, and shows an error if that also fails', async () => {
      // The selection effect runs on mount, before the menu fetch resolves
      // (menuList.state.products is still `[]`) — the id isn't found there,
      // so `menuItemDetailUsecase` falls back to its own fetch (D6), which
      // fails for an id the mock repository doesn't have.
      renderHandler({
        menuListParams: {
          products: [],
          categories: [],
          selectedProductId: 999,
        },
      });

      await settle();

      expect(screen.getByText('Gagal memuat produk')).toBeTruthy();
      // The menu itself loaded fine — only the sheet's own fetch failed.
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

    it('resets the draft when a different item is opened next', async () => {
      const user = userEvent.setup();
      renderHandler();
      await settle();

      await user.click(screen.getByText('Es Kopi Susu'));
      await settle();
      await user.click(screen.getByLabelText('Tutup'));

      await user.click(screen.getByText('Nasi Goreng'));
      await settle();

      // Renders behind the sheet too — one in the list, one in the sheet.
      expect(screen.getAllByText('Nasi Goreng')).toHaveLength(2);
      expect(screen.queryByText('Regular')).toBeNull();
    });
  });
});
