import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuItemDetailHandler } from './MenuItemDetailHandler';
import { MockMenuRepository } from '../../data/mock';
import { MenuItemDetailUsecase } from '../../domain';
import { NavigationProvider } from '../navigation';
import { flushPromises } from '../../utils/testUtils';

const mockBack = jest.fn();
const mockOnAddToCart = jest.fn();

const renderHandler = (
  repository = new MockMenuRepository(),
  productId = 1
) => {
  const menuItemDetailUsecase = new MenuItemDetailUsecase(repository, {
    productId,
  });
  return {
    repository,
    ...render(
      <NavigationProvider
        value={{ push: jest.fn(), replace: jest.fn(), back: mockBack }}
      >
        <MenuItemDetailHandler
          menuItemDetailUsecase={menuItemDetailUsecase}
          onAddToCart={mockOnAddToCart}
        />
      </NavigationProvider>
    ),
  };
};

describe('MenuItemDetailHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading indicator while the product is loading', async () => {
    renderHandler();
    expect(screen.getByText('Memuat produk...')).toBeTruthy();
    await act(async () => {
      await flushPromises();
    });
  });

  it('shows option chips once loaded, with the CTA disabled until every option has a value', async () => {
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Regular')).toBeTruthy();
    expect(screen.getByText('Large')).toBeTruthy();
    expect(
      (screen.getByRole('button', {
        name: 'Pilih semua opsi',
      }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('resolves the variant and enables the CTA with the live price once every option is selected', async () => {
    const user = userEvent.setup();
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByRole('button', { name: 'Regular' }));

    await act(async () => {
      await flushPromises();
    });

    expect(
      (screen.getByRole('button', {
        name: 'Tambah ke keranjang · Rp 18.000',
      }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it('adds to cart with the resolved variant, amount and note, then closes the sheet', async () => {
    const user = userEvent.setup();
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByRole('button', { name: 'Regular' }));
    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByLabelText('Tambah jumlah'));
    await user.type(
      screen.getByPlaceholderText('Contoh: less sugar, tanpa es'),
      'less sugar'
    );

    await user.click(
      screen.getByRole('button', { name: 'Tambah ke keranjang · Rp 36.000' })
    );

    expect(mockOnAddToCart).toHaveBeenCalledWith({
      variantId: 1,
      amount: 2,
      note: 'less sugar',
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('goes straight to ready for a product with no options', async () => {
    renderHandler(new MockMenuRepository(), 2);

    await act(async () => {
      await flushPromises();
      await flushPromises();
    });

    expect(
      (screen.getByRole('button', {
        name: 'Tambah ke keranjang · Rp 25.000',
      }) as HTMLButtonElement).disabled
    ).toBe(false);
  });

  it('shows an error state when the product fails to load, and recovers on retry', async () => {
    const user = userEvent.setup();
    const repository = new MockMenuRepository();
    repository.setShouldFail(true);
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Gagal memuat produk')).toBeTruthy();

    repository.setShouldFail(false);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('closes the sheet when the close button is pressed', async () => {
    const user = userEvent.setup();
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByLabelText('Tutup'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
