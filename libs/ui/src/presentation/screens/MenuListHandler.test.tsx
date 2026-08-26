import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuListHandler } from './MenuListHandler';
import { MockMenuRepository } from '../../data/mock';
import { MenuListUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const renderHandler = (repository = new MockMenuRepository()) => {
  const menuListUsecase = new MenuListUsecase(repository, {
    products: [],
    categories: [],
  });
  return {
    repository,
    ...render(
      <MenuListHandler
        menuListUsecase={menuListUsecase}
        tableCode="3F7H9K2M5P"
      />
    ),
  };
};

describe('MenuListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a skeleton while the menu is loading', async () => {
    renderHandler();
    expect(screen.getByTestId('skeleton-list')).toBeTruthy();
    await act(async () => {
      await flushPromises();
    });
  });

  it('shows every product grouped by category once loaded', async () => {
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
    expect(screen.getByText('Nasi Goreng')).toBeTruthy();
    // "Minuman"/"Makanan" render twice each: once as a chip, once as the
    // section heading above their products.
    expect(screen.getAllByText('Minuman')).toHaveLength(2);
    expect(screen.getAllByText('Makanan')).toHaveLength(2);
  });

  it('shows the lowest variant price as a starting price', async () => {
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('mulai Rp 18.000')).toBeTruthy();
    expect(screen.getByText('mulai Rp 25.000')).toBeTruthy();
  });

  it('shows an error state when the fetch fails, and recovers on retry', async () => {
    const user = userEvent.setup();
    const repository = new MockMenuRepository();
    repository.setShouldFail(true);
    renderHandler(repository);

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Gagal memuat menu')).toBeTruthy();

    repository.setShouldFail(false);
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Es Kopi Susu')).toBeTruthy();
  });

  it('filters to a single category when its chip is pressed', async () => {
    const user = userEvent.setup();
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByRole('button', { name: 'Makanan' }));

    await act(async () => {
      await flushPromises();
    });

    expect(screen.getByText('Nasi Goreng')).toBeTruthy();
    expect(screen.queryByText('Es Kopi Susu')).toBeNull();
  });

  it('navigates to the product detail route when a product card is pressed', async () => {
    const user = userEvent.setup();
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    await user.click(screen.getByText('Es Kopi Susu'));

    expect(mockPush).toHaveBeenCalledWith('/t/3F7H9K2M5P/products/1');
  });

  it('reflects typed text in the search input', async () => {
    const user = userEvent.setup();
    renderHandler();

    await act(async () => {
      await flushPromises();
    });

    const input = screen.getByPlaceholderText<HTMLInputElement>('Cari menu');
    await user.type(input, 'kopi');

    expect(input.value).toBe('kopi');
  });
});
