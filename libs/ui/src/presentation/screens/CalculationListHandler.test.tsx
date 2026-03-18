import React from 'react';
import { render, act } from '@testing-library/react';
import { CalculationListHandler } from './CalculationListHandler';
import { MockAuthRepository, MockCalculationRepository } from '../../data/mock';
import {
  AuthLogoutUsecase,
  CalculationCompleteUsecase,
  CalculationDeleteUsecase,
  CalculationListUsecase,
} from '../../domain';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const calculationListCtrl = {
  state: {
    type: 'loaded' as string,
    calculations: [] as never[],
  },
  dispatch: jest.fn(),
};
const calculationDeleteCtrl = {
  state: { type: 'hidden' as string },
  dispatch: jest.fn(),
};
const calculationCompleteCtrl = {
  state: { type: 'hidden' as string },
  dispatch: jest.fn(),
};
const authLogoutCtrl = {
  state: { type: 'idle' as string },
  dispatch: jest.fn(),
};

jest.mock('../controllers', () => ({
  useCalculationListController: () => ({
    state: calculationListCtrl.state,
    dispatch: calculationListCtrl.dispatch,
  }),
  useCalculationDeleteController: () => ({
    state: calculationDeleteCtrl.state,
    dispatch: calculationDeleteCtrl.dispatch,
  }),
  useCalculationCompleteController: () => ({
    state: calculationCompleteCtrl.state,
    dispatch: calculationCompleteCtrl.dispatch,
  }),
  useAuthLogoutController: () => ({
    state: authLogoutCtrl.state,
    dispatch: authLogoutCtrl.dispatch,
  }),
}));

const createProps = () => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  calculationListUsecase: new CalculationListUsecase(new MockCalculationRepository(), {
    calculations: [],
  }),
  calculationDeleteUsecase: new CalculationDeleteUsecase(new MockCalculationRepository()),
  calculationCompleteUsecase: new CalculationCompleteUsecase(new MockCalculationRepository()),
});

describe('CalculationListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    calculationListCtrl.state = { type: 'loaded', calculations: [] };
    calculationDeleteCtrl.state = { type: 'hidden' };
    calculationCompleteCtrl.state = { type: 'hidden' };
    authLogoutCtrl.state = { type: 'idle' };
  });

  describe('delete → refetch orchestration', () => {
    it('should dispatch FETCH to calculation list when delete succeeds', async () => {
      calculationDeleteCtrl.state = { type: 'deletingSuccess' };

      await act(async () => {
        render(<CalculationListHandler {...createProps()} />);
      });

      expect(calculationListCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when delete has not succeeded', async () => {
      calculationDeleteCtrl.state = { type: 'hidden' };

      await act(async () => {
        render(<CalculationListHandler {...createProps()} />);
      });

      expect(calculationListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });

  describe('complete → refetch orchestration', () => {
    it('should dispatch FETCH to calculation list when complete succeeds', async () => {
      calculationCompleteCtrl.state = { type: 'completingSuccess' };

      await act(async () => {
        render(<CalculationListHandler {...createProps()} />);
      });

      expect(calculationListCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when complete has not succeeded', async () => {
      calculationCompleteCtrl.state = { type: 'hidden' };

      await act(async () => {
        render(<CalculationListHandler {...createProps()} />);
      });

      expect(calculationListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when completing is in progress', async () => {
      calculationCompleteCtrl.state = { type: 'completing' };

      await act(async () => {
        render(<CalculationListHandler {...createProps()} />);
      });

      expect(calculationListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });

  describe('list variant rendering', () => {
    it('should render loading state when calculation list is loading', () => {
      calculationListCtrl.state = { type: 'loading', calculations: [] };

      const { getByText } = render(<CalculationListHandler {...createProps()} />);

      expect(getByText('Fetching Calculations...')).toBeTruthy();
    });

    it('should render error state when list fetch fails', () => {
      calculationListCtrl.state = { type: 'error', calculations: [] };

      const { getByText } = render(<CalculationListHandler {...createProps()} />);

      expect(getByText('Failed to Fetch Calculations')).toBeTruthy();
    });
  });
});
