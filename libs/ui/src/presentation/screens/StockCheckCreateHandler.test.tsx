import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockCheckCreateHandler } from './StockCheckCreateHandler';
import { MockAuthRepository, MockStockCheckRepository } from '../../data/mock';
import { AuthLogoutUsecase, StockCheckCreateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const items = [
  {
    materialId: 1,
    materialName: 'Tepung',
    purchaseUnit: 'Kg',
    currentStock: null,
  },
];

const createProps = (options: { shouldFail?: boolean } = {}) => {
  const stockCheckRepo = new MockStockCheckRepository();
  if (options.shouldFail) stockCheckRepo.shouldFail = true;
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    stockCheckCreateUsecase: new StockCheckCreateUsecase(stockCheckRepo, {
      items,
    }),
  };
};

describe('StockCheckCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form with the given items', () => {
      render(<StockCheckCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      expect(screen.getByText('Tepung')).toBeTruthy();
      expect(screen.getByText('0 / 1 materials checked')).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should not navigate when a material is left blank and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<StockCheckCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
      expect(
        screen.getByText('Please enter the current stock')
      ).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/stock-checks" after successful creation', async () => {
      const user = userEvent.setup();
      render(<StockCheckCreateHandler {...createProps()} />);

      await user.type(screen.getByPlaceholderText('—'), '5');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/stock-checks');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(<StockCheckCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByPlaceholderText('—'), '5');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show toast error message when creation fails', async () => {
      const user = userEvent.setup();
      render(<StockCheckCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByPlaceholderText('—'), '5');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Stock Check Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when creation fails', async () => {
      const user = userEvent.setup();
      render(<StockCheckCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByPlaceholderText('—'), '5');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<StockCheckCreateHandler {...createProps()} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });
});
