import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculationListHandler } from './CalculationListHandler';
import { MockAuthRepository, MockCalculationRepository } from '../../data/mock';
import {
  AuthLogoutUsecase,
  CalculationCompleteUsecase,
  CalculationDeleteUsecase,
  CalculationListUsecase,
} from '../../domain';
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
    calculationRepo?: MockCalculationRepository;
  } = {}
) => {
  const calculationRepo = options.calculationRepo ?? new MockCalculationRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    calculationListUsecase: new CalculationListUsecase(calculationRepo, {
      calculations: [],
    }),
    calculationDeleteUsecase: new CalculationDeleteUsecase(calculationRepo),
    calculationCompleteUsecase: new CalculationCompleteUsecase(calculationRepo),
  };
};

describe('CalculationListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<CalculationListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show calculation list after successful fetch', async () => {
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // MockCalculationRepository has 2 calculations with wallet name 'Cash'
      const walletHeadings = screen.getAllByRole('heading', { name: 'Cash' });
      expect(walletHeadings.length).toBe(2);
    });

    it('should show error state when fetch fails', async () => {
      const calculationRepo = new MockCalculationRepository();
      calculationRepo.setShouldFail(true);

      render(<CalculationListHandler {...createProps({ calculationRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Calculations' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should preserve list content during revalidation after delete', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      expect(screen.queryByTestId('skeleton-list')).toBeNull();

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should show empty state when no calculations exist', async () => {
      const calculationRepo = new MockCalculationRepository();
      calculationRepo.calculations = [];

      render(<CalculationListHandler {...createProps({ calculationRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Calculation is Empty' })).toBeTruthy();
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Calculation')).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByText('Delete Calculation')).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByText('Delete Calculation')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Calculation')).toBeNull();
    });

    it('should refetch calculation list after successful delete', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      render(<CalculationListHandler {...createProps({ calculationRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByRole('heading', { name: 'Cash' }).length).toBe(2);

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByText('Delete Calculation')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Calculation')).toBeNull();
      expect(screen.getAllByRole('heading', { name: 'Cash' }).length).toBe(1);
    });

    it('should show toast after successful delete', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Delete Calculation Success');
    });
  });

  describe('complete modal', () => {
    it('should not show complete modal initially', async () => {
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Complete Calculation')).toBeNull();
    });

    it('should show complete modal when complete menu is pressed', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const completeMenuItems = screen.getAllByRole('button', { name: 'Complete' });
      await user.click(completeMenuItems[0]);

      expect(screen.getByText('Complete Calculation')).toBeTruthy();
    });

    it('should hide complete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const completeMenuItems = screen.getAllByRole('button', { name: 'Complete' });
      await user.click(completeMenuItems[0]);
      expect(screen.getByText('Complete Calculation')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Complete Calculation')).toBeNull();
    });

    it('should refetch calculation list after successful complete', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      render(<CalculationListHandler {...createProps({ calculationRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      const completeMenuItems = screen.getAllByRole('button', { name: 'Complete' });
      await user.click(completeMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Complete Calculation')).toBeNull();
    });

    it('should show toast after successful complete', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const completeMenuItems = screen.getAllByRole('button', { name: 'Complete' });
      await user.click(completeMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Complete Calculation Success');
    });
  });

  describe('navigation', () => {
    it('should navigate to calculation edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/calculations/1');
    });

    it('should navigate to calculation page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<CalculationListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const walletHeadings = screen.getAllByRole('heading', { name: 'Cash' });
      await user.click(walletHeadings[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/calculations/1');
    });
  });

  describe('error recovery', () => {
    it('should refetch calculations when retry button is pressed', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      calculationRepo.setShouldFail(true);

      render(<CalculationListHandler {...createProps({ calculationRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Calculations' })).toBeTruthy();

      calculationRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getAllByRole('heading', { name: 'Cash' }).length).toBeGreaterThan(0);
    });
  });
});
