import React from 'react';
import { render, act } from '@testing-library/react';
import { TransactionCreateHandler } from './TransactionCreateHandler';
import { Variant } from '../../domain/entities/Variant';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const mockPrint = jest.fn().mockResolvedValue(undefined);
jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  usePrinter: () => ({ print: mockPrint }),
}));

const mockConfirmationShow = jest.fn();
jest.mock('../components', () => ({
  ...jest.requireActual('../components'),
  useConfirmationAlert: () => ({ show: mockConfirmationShow }),
}));

// Avoid rendering the real screen tree — these tests only exercise the
// payingSuccess print-chain orchestration in the handler.
jest.mock('./TransactionCreateScreen', () => ({
  TransactionCreateScreen: () => null,
}));

const buildVariant = (
  productName: string,
  station: 'KITCHEN' | 'BAR' | 'NONE'
): Variant => ({
  id: 1,
  name: 'Variant',
  price: 10000,
  materials: [],
  product: {
    id: 1,
    name: productName,
    category: { id: 1, name: 'Category', station, createdAt: '2024-01-01T00:00:00.000Z' },
    imageUrl: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    options: [],
    saleType: 'purchase',
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  values: [
    { id: 1, variantId: 1, optionValueId: 1, optionValue: { id: 1, name: 'Large' } },
  ],
  pricingTiers: [],
});

let transactionItemsValue: {
  variant: Variant;
  price: number;
  amount: number;
  discountAmount: number;
  note: string;
}[] = [];

const transactionCreateCtrl = {
  state: {
    type: 'idle' as string,
    transactionId: null as number | null,
    values: { transactionItems: [] as never[], transactionCoupons: [] as never[] },
  },
  dispatch: jest.fn(),
  form: {
    getValues: (key: string) => {
      if (key === 'name') return 'Table 1';
      if (key === 'orderNumber') return 1;
      if (key === 'transactionItems') return transactionItemsValue;
      if (key === 'transactionCoupons') return [];
      return undefined;
    },
  } as never,
  isCouponSheetOpen: false,
  onCouponSheetOpenChange: jest.fn(),
  onItemCouponSheetOpen: jest.fn(),
  onAddItem: jest.fn(),
  onAddCoupon: jest.fn(),
  onRemoveItemCoupon: jest.fn(),
  itemsFieldArray: {} as never,
  couponsFieldArray: {} as never,
};

const transactionPayCtrl = {
  state: {
    type: 'hidden' as string,
    wallets: [] as { id: number; name: string; isCashless: boolean; isPaymentTarget: boolean }[],
    transactionTotal: 0,
    transactionId: null as number | null,
    paidAmount: 0,
    walletId: null as number | null,
  },
  dispatch: jest.fn(),
  form: {} as never,
};

const transactionItemSelectCtrl = {
  state: {
    type: 'loaded' as string,
    products: [] as never[],
    totalItem: 0,
    page: 1,
    itemPerPage: 10,
    query: '',
    selectedOptionValues: [] as never[],
    selectedProduct: null as never,
    amount: 1,
  },
  dispatch: jest.fn(),
};

const couponListCtrl = {
  state: { type: 'loaded' as string, coupons: [] as never[] },
  dispatch: jest.fn(),
};

const authLogoutCtrl = {
  state: { type: 'idle' as string },
  dispatch: jest.fn(),
};

jest.mock('../controllers', () => ({
  useTransactionCreateController: () => transactionCreateCtrl,
  useTransactionItemSelectController: () => transactionItemSelectCtrl,
  useTransactionPayController: () => transactionPayCtrl,
  useCouponListController: () => couponListCtrl,
  useAuthLogoutController: () => authLogoutCtrl,
}));

const usecaseProps = {
  transactionCreateUsecase: {} as never,
  transactionItemSelectUsecase: {} as never,
  transactionPayUsecase: {} as never,
  couponListUsecase: {} as never,
  authLogoutUsecase: {} as never,
};

const confirmLatestPrompt = async (title: string) => {
  const call = mockConfirmationShow.mock.calls.find(([params]) => params.title === title);
  expect(call).toBeDefined();
  await act(async () => {
    call?.[0].onConfirm?.();
    await flushPromises();
  });
};

// onCancel chains to the next prompt via a 200ms setTimeout (see
// TransactionCreateHandler) — wait past it with real timers.
const cancelLatestPrompt = async (title: string) => {
  const call = mockConfirmationShow.mock.calls.find(([params]) => params.title === title);
  expect(call).toBeDefined();
  await act(async () => {
    call?.[0].onCancel?.();
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
};

describe('TransactionCreateHandler print flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionPayCtrl.state = {
      type: 'payingSuccess',
      wallets: [{ id: 1, name: 'Cash', isCashless: false, isPaymentTarget: true }],
      transactionTotal: 30000,
      transactionId: 1,
      paidAmount: 30000,
      walletId: 1,
    };
  });

  it('prompts invoice then a single order slip grouped by station', async () => {
    transactionItemsValue = [
      { variant: buildVariant('Fried Rice', 'KITCHEN'), price: 10000, amount: 1, discountAmount: 0, note: '' },
      { variant: buildVariant('Beer', 'BAR'), price: 20000, amount: 1, discountAmount: 0, note: '' },
    ];

    await act(async () => {
      render(<TransactionCreateHandler {...usecaseProps} />);
      await flushPromises();
    });

    await confirmLatestPrompt('Print Invoice');
    expect(mockPrint).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'INVOICE' })
    );

    await confirmLatestPrompt('Print Order Slip');
    expect(mockPrint).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ORDER_SLIP',
        orderSlip: expect.objectContaining({
          items: {
            kitchens: [expect.objectContaining({ name: 'Fried Rice - Large' })],
            bars: [expect.objectContaining({ name: 'Beer - Large' })],
          },
        }),
      })
    );

    expect(mockPrint).toHaveBeenCalledTimes(2);
    expect(mockRouterPush).toHaveBeenCalledWith('/transactions');
  });

  it('shows the order slip prompt only once even when both stations have items', async () => {
    transactionItemsValue = [
      { variant: buildVariant('Fried Rice', 'KITCHEN'), price: 10000, amount: 1, discountAmount: 0, note: '' },
      { variant: buildVariant('Beer', 'BAR'), price: 20000, amount: 1, discountAmount: 0, note: '' },
    ];

    await act(async () => {
      render(<TransactionCreateHandler {...usecaseProps} />);
      await flushPromises();
    });

    await confirmLatestPrompt('Print Invoice');

    const orderSlipPrompts = mockConfirmationShow.mock.calls.filter(
      ([params]) => params.title === 'Print Order Slip'
    );
    expect(orderSlipPrompts).toHaveLength(1);

    expect(mockConfirmationShow).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Print Kitchen Slip' })
    );
    expect(mockConfirmationShow).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Print Bar Slip' })
    );
  });

  it('skips the order slip prompt when no item belongs to a station', async () => {
    transactionItemsValue = [
      { variant: buildVariant('Board Game Ticket', 'NONE'), price: 10000, amount: 1, discountAmount: 0, note: '' },
    ];

    await act(async () => {
      render(<TransactionCreateHandler {...usecaseProps} />);
      await flushPromises();
    });

    await confirmLatestPrompt('Print Invoice');

    expect(mockConfirmationShow).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Print Order Slip' })
    );
    expect(mockPrint).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/transactions');
  });

  it('navigates to /transactions when every prompt is cancelled', async () => {
    transactionItemsValue = [
      { variant: buildVariant('Fried Rice', 'KITCHEN'), price: 10000, amount: 1, discountAmount: 0, note: '' },
    ];

    await act(async () => {
      render(<TransactionCreateHandler {...usecaseProps} />);
      await flushPromises();
    });

    await cancelLatestPrompt('Print Invoice');
    await cancelLatestPrompt('Print Order Slip');

    expect(mockPrint).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith('/transactions');
  });
});
