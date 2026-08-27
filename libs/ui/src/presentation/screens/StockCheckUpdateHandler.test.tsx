import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockCheckUpdateHandler } from './StockCheckUpdateHandler';
import { MockAuthRepository, MockStockCheckRepository } from '../../data/mock';
import { AuthLogoutUsecase, StockCheckUpdateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (
  options: {
    stockCheckId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const stockCheckId = options.stockCheckId ?? 1;
  const stockCheckRepo = new MockStockCheckRepository();
  if (options.shouldFail) stockCheckRepo.shouldFail = true;

  const preloadedStockCheck = options.preloaded
    ? stockCheckRepo.stockChecks.find((s) => s.id === stockCheckId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    stockCheckUpdateUsecase: new StockCheckUpdateUsecase(stockCheckRepo, {
      stockCheckId,
      stockCheck: preloadedStockCheck,
    }),
  };
};

describe('StockCheckUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      await flushPromises();
    });
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching stock check', async () => {
      render(<StockCheckUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Stock Check...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after stock check data loads', async () => {
      render(<StockCheckUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when stock check is preloaded', async () => {
      render(<StockCheckUpdateHandler {...createProps({ preloaded: true })} />);

      expect(screen.getByText('Tepung')).toBeTruthy();
      expect(screen.getByDisplayValue('3')).toBeTruthy();

      await act(async () => {
        await flushPromises();
      });
    });

    it('should fill the form with fetched values when data loads after mount', async () => {
      render(<StockCheckUpdateHandler {...createProps({ preloaded: false })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Tepung')).toBeTruthy();
      expect(screen.getByDisplayValue('3')).toBeTruthy();
      expect(screen.getByText('1 / 1 materials checked')).toBeTruthy();
    });

    it('should show error state when stock check fetch fails', async () => {
      render(<StockCheckUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Stock Check' })
      ).toBeTruthy();
    });
  });

  describe('error recovery', () => {
    it('should refetch stock check when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const stockCheckRepo = new MockStockCheckRepository();
      stockCheckRepo.shouldFail = true;

      render(
        <StockCheckUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          stockCheckUpdateUsecase={
            new StockCheckUpdateUsecase(stockCheckRepo, {
              stockCheckId: 1,
              stockCheck: null,
            })
          }
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Stock Check' })
      ).toBeTruthy();

      stockCheckRepo.shouldFail = false;

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/stock-checks" after successful update', async () => {
      const user = userEvent.setup();
      render(<StockCheckUpdateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/stock-checks');
    });

    it('should not navigate without user interaction', async () => {
      render(<StockCheckUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const stockCheckRepo = new MockStockCheckRepository();
      const preloaded = stockCheckRepo.stockChecks[0];
      const stockCheckUpdateUsecase = new StockCheckUpdateUsecase(stockCheckRepo, {
        stockCheckId: preloaded.id,
        stockCheck: preloaded,
      });
      stockCheckRepo.shouldFail = true;

      render(
        <StockCheckUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          stockCheckUpdateUsecase={stockCheckUpdateUsecase}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when update fails', async () => {
      const user = userEvent.setup();
      const stockCheckRepo = new MockStockCheckRepository();
      const preloaded = stockCheckRepo.stockChecks[0];
      const stockCheckUpdateUsecase = new StockCheckUpdateUsecase(stockCheckRepo, {
        stockCheckId: preloaded.id,
        stockCheck: preloaded,
      });
      stockCheckRepo.shouldFail = true;

      render(
        <StockCheckUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          stockCheckUpdateUsecase={stockCheckUpdateUsecase}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Stock Check Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when update fails', async () => {
      const user = userEvent.setup();
      const stockCheckRepo = new MockStockCheckRepository();
      const preloaded = stockCheckRepo.stockChecks[0];
      const stockCheckUpdateUsecase = new StockCheckUpdateUsecase(stockCheckRepo, {
        stockCheckId: preloaded.id,
        stockCheck: preloaded,
      });
      stockCheckRepo.shouldFail = true;

      render(
        <StockCheckUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          stockCheckUpdateUsecase={stockCheckUpdateUsecase}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', async () => {
      render(<StockCheckUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
      await act(async () => {
        await flushPromises();
      });
    });
  });
});
