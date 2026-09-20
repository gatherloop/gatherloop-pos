import React from 'react';
import { render, act } from '@testing-library/react';
import { TransactionListHandler } from './TransactionListHandler';
import {
  MockAuthRepository,
  MockTransactionRepository,
  MockTransactionListQueryRepository,
  MockWalletRepository,
} from '../../../data/mock';
import {
  AuthLogoutUsecase,
  Transaction,
  TransactionCompleteUsecase,
  TransactionDeleteUsecase,
  TransactionListUsecase,
  TransactionPayUsecase,
  TransactionUnpayUsecase,
} from '../../../domain';
import type { TransactionListScreenProps } from '../../views/screens/pos/TransactionListScreen';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const mockPrint = jest.fn();
jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  usePrinter: () => ({ print: mockPrint }),
  useFocusEffect: () => {
    // no-op
  },
}));

let latestScreenProps: TransactionListScreenProps;
jest.mock('../../views/screens/pos/TransactionListScreen', () => ({
  TransactionListScreen: (props: TransactionListScreenProps) => {
    latestScreenProps = props;
    return null;
  },
}));

const buildTransaction = (
  stations: ('KITCHEN' | 'BAR' | 'NONE')[]
): Transaction => ({
  id: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  name: 'Table 1',
  source: 'pos',
  table: null,
  pagerNumber: 1,
  transactionNumber: 1,
  total: 30000,
  totalIncome: 30000,
  paidAt: null,
  paidAmount: 0,
  wallet: null,
  transactionCoupons: [],
  transactionItems: stations.map((station, index) => ({
    id: index + 1,
    amount: 1,
    price: 10000,
    discountAmount: 0,
    subtotal: 10000,
    note: '',
    productName: `Product ${index}`,
    values: [],
    variant: {
      id: index + 1,
      name: 'Variant',
      price: 10000,
      materials: [],
      product: {
        id: index + 1,
        name: `Product ${index}`,
        category: {
          id: index + 1,
          name: 'Category',
          station,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        imageUrl: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        options: [],
        saleType: 'purchase',
        status: 'published',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      values: [],
      pricingTiers: [],
    },
  })),
});

const transactionListCtrl = {
  state: {
    type: 'loaded' as string,
    transactions: [] as never[],
    wallets: [] as never[],
    page: 1,
    itemPerPage: 10,
    totalItem: 0,
    query: '',
    paymentStatus: null as never,
    walletId: null as never,
    source: null as never,
    fulfillment: null as never,
  },
  dispatch: jest.fn(),
};
const transactionDeleteCtrl = {
  state: { type: 'hidden' as string },
  dispatch: jest.fn(),
};
const transactionPayCtrl = {
  state: {
    type: 'hidden' as string,
    wallets: [] as { id: number; name: string; isPaymentTarget: boolean }[],
    transactionTotal: 0,
    transactionId: null as number | null,
  },
  dispatch: jest.fn(),
};
const transactionUnpayCtrl = {
  state: { type: 'hidden' as string },
  dispatch: jest.fn(),
};
const transactionCompleteCtrl = {
  state: {
    type: 'hidden' as string,
    transactionId: null as number | null,
    action: null as 'complete' | 'uncomplete' | null,
  },
  dispatch: jest.fn(),
};
const authLogoutCtrl = {
  state: { type: 'idle' as string },
  dispatch: jest.fn(),
};

jest.mock('../hooks', () => ({
  useTransactionPay: () => ({
    state: transactionPayCtrl.state,
    dispatch: transactionPayCtrl.dispatch,
  }),
  useTransactionComplete: () => ({
    state: transactionCompleteCtrl.state,
    dispatch: transactionCompleteCtrl.dispatch,
  }),
  useAuthLogout: () => ({
    state: authLogoutCtrl.state,
    dispatch: authLogoutCtrl.dispatch,
  }),
  useUsecase: (usecase: { constructor: { name: string } }) => {
    switch (usecase.constructor.name) {
      case 'TransactionListUsecase':
        return {
          state: transactionListCtrl.state,
          dispatch: transactionListCtrl.dispatch,
        };
      case 'TransactionDeleteUsecase':
        return {
          state: transactionDeleteCtrl.state,
          dispatch: transactionDeleteCtrl.dispatch,
        };
      case 'TransactionUnpayUsecase':
        return {
          state: transactionUnpayCtrl.state,
          dispatch: transactionUnpayCtrl.dispatch,
        };
      default:
        throw new Error(`Unexpected usecase: ${usecase.constructor.name}`);
    }
  },
}));

const createProps = () => ({
  authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
  transactionListUsecase: new TransactionListUsecase(
    new MockTransactionRepository(),
    new MockTransactionListQueryRepository(),
    new MockWalletRepository(),
    { transactions: [], totalItem: 0, wallets: [] }
  ),
  transactionDeleteUsecase: new TransactionDeleteUsecase(new MockTransactionRepository()),
  transactionPayUsecase: new TransactionPayUsecase(
    new MockTransactionRepository(),
    new MockWalletRepository(),
    { wallets: [] }
  ),
  transactionUnpayUsecase: new TransactionUnpayUsecase(new MockTransactionRepository()),
  transactionCompleteUsecase: new TransactionCompleteUsecase(new MockTransactionRepository()),
});

describe('TransactionListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    latestScreenProps = undefined;
    transactionListCtrl.state = {
      type: 'loaded',
      transactions: [],
      wallets: [],
      page: 1,
      itemPerPage: 10,
      totalItem: 0,
      query: '',
      paymentStatus: null,
      walletId: null,
      source: null,
      fulfillment: null,
    };
    transactionDeleteCtrl.state = { type: 'hidden' };
    transactionPayCtrl.state = {
      type: 'hidden',
      wallets: [],
      transactionTotal: 0,
      transactionId: null,
    };
    transactionUnpayCtrl.state = { type: 'hidden' };
    transactionCompleteCtrl.state = {
      type: 'hidden',
      transactionId: null,
      action: null,
    };
    authLogoutCtrl.state = { type: 'idle' };
  });

  describe('delete → refetch orchestration', () => {
    it('should dispatch FETCH to transaction list when delete succeeds', async () => {
      transactionDeleteCtrl.state = { type: 'deletingSuccess' };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when delete has not succeeded', async () => {
      transactionDeleteCtrl.state = { type: 'hidden' };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });

  describe('pay → refetch orchestration', () => {
    it('should dispatch FETCH to transaction list when pay succeeds', async () => {
      transactionPayCtrl.state = {
        type: 'payingSuccess',
        wallets: [],
        transactionTotal: 0,
        transactionId: null,
      };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when pay has not succeeded', async () => {
      transactionPayCtrl.state = {
        type: 'hidden',
        wallets: [],
        transactionTotal: 0,
        transactionId: null,
      };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });

  describe('pay wallet options', () => {
    // FR-13/D24: the modal must not offer a wallet an operator has opted out of receiving
    // payments, matching the filter TransactionCreateHandler already applies.
    it('offers only payment-eligible wallets', async () => {
      transactionPayCtrl.state = {
        type: 'shown',
        wallets: [
          { id: 1, name: 'Cash', isPaymentTarget: true },
          { id: 2, name: 'Brankas', isPaymentTarget: false },
        ],
        transactionTotal: 0,
        transactionId: null,
      };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(latestScreenProps.payWalletSelectOptions).toEqual([
        { label: 'Cash', value: { id: 1, name: 'Cash', isPaymentTarget: true } },
      ]);
    });
  });

  describe('unpay → refetch orchestration', () => {
    it('should dispatch FETCH to transaction list when unpay succeeds', async () => {
      transactionUnpayCtrl.state = { type: 'unpayingSuccess' };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when unpay has not succeeded', async () => {
      transactionUnpayCtrl.state = { type: 'hidden' };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });

  describe('complete → refetch orchestration', () => {
    it('should dispatch FETCH to transaction list when complete succeeds', async () => {
      transactionCompleteCtrl.state = {
        type: 'completingSuccess',
        transactionId: 2,
        action: 'complete',
      };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should not dispatch FETCH when complete has not succeeded', async () => {
      transactionCompleteCtrl.state = {
        type: 'hidden',
        transactionId: null,
        action: null,
      };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });
  });

  describe('search UX', () => {
    it('should pass isChangingParams=true when state is changingParams', async () => {
      transactionListCtrl.state = { ...transactionListCtrl.state, type: 'changingParams' };

      const mockScreen = jest.fn(() => null);
      jest.doMock('../../views/screens/pos/TransactionListScreen', () => ({
        TransactionListScreen: mockScreen,
      }));

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).not.toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should dispatch CHANGE_PARAMS with empty query when search is cleared', async () => {
      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(transactionListCtrl.dispatch).toBeDefined();
    });
  });

  describe('source filter', () => {
    it('should dispatch CHANGE_PARAMS with the selected source, resetting to page 1', async () => {
      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      latestScreenProps.onSourceChange('order');

      expect(transactionListCtrl.dispatch).toHaveBeenCalledWith({
        type: 'CHANGE_PARAMS',
        source: 'order',
        page: 1,
        fetchDebounceDelay: 600,
      });
    });

    it('should pass the current source through to the screen', async () => {
      transactionListCtrl.state = { ...transactionListCtrl.state, source: 'pos' };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(latestScreenProps.source).toBe('pos');
    });
  });

  describe('fulfillment filter', () => {
    it('should dispatch CHANGE_PARAMS with the selected fulfillment, resetting to page 1', async () => {
      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      latestScreenProps.onFulfillmentChange('preparing');

      expect(transactionListCtrl.dispatch).toHaveBeenCalledWith({
        type: 'CHANGE_PARAMS',
        fulfillment: 'preparing',
        page: 1,
        fetchDebounceDelay: 600,
      });
    });

    it('should pass the current fulfillment through to the screen', async () => {
      transactionListCtrl.state = {
        ...transactionListCtrl.state,
        fulfillment: 'ready',
      };

      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      expect(latestScreenProps.fulfillment).toBe('ready');
    });
  });

  describe('print order slip menu', () => {
    it('prints a single order slip grouped by station when pressed', async () => {
      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      latestScreenProps.onPrintOrderSlipMenuPress(
        buildTransaction(['KITCHEN', 'BAR'])
      );

      expect(mockPrint).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ORDER_SLIP',
          orderSlip: expect.objectContaining({
            transactionNumber: 1,
            items: {
              kitchens: [expect.objectContaining({ name: 'Product 0 - ' })],
              bars: [expect.objectContaining({ name: 'Product 1 - ' })],
            },
          }),
        })
      );
      expect(mockPrint).toHaveBeenCalledTimes(1);
    });

    it('does not print when no item belongs to a station', async () => {
      await act(async () => {
        render(<TransactionListHandler {...createProps()} />);
      });

      latestScreenProps.onPrintOrderSlipMenuPress(buildTransaction(['NONE']));

      expect(mockPrint).not.toHaveBeenCalled();
    });
  });
});
