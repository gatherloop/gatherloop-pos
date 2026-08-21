import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import { TransactionCreateScreen } from './TransactionCreateScreen';
import type { TransactionForm } from '../../domain';
import { mockWallet, mockWallets, mockProducts, mockVariant } from '../../../.storybook/mocks/mockData';

const defaultValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [],
  transactionCoupons: [],
};

// Phase 6 of docs/prd-transaction-mobile-ux.md (FR-6): enough items to make
// the form taller than a 640px viewport, so the sticky Total/Submit bar has
// something to stay pinned over while the item list scrolls underneath it.
const tenItemsDefaultValues: TransactionForm = {
  name: 'Order #002',
  orderNumber: 2,
  transactionItems: Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    variant: mockVariant,
    amount: 1,
    price: mockVariant.price,
    discountAmount: 0,
    note: '',
  })),
  transactionCoupons: [],
};

const CreateStory = ({
  values = defaultValues,
}: {
  values?: TransactionForm;
}) => {
  const form = useForm<TransactionForm>({ defaultValues: values });
  const itemsFieldArray = useFieldArray({ control: form.control, name: 'transactionItems', keyName: 'key' });
  const couponsFieldArray = useFieldArray({ control: form.control, name: 'transactionCoupons', keyName: 'key' });
  const payForm = useForm({ defaultValues: { wallet: mockWallet, paidAmount: 0 } });

  return (
    <TransactionCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      isCouponSheetOpen={false}
      onCouponSheetOpenChange={fn()}
      onItemCouponSheetOpen={fn()}
      onRemoveItemCoupon={fn()}
      itemsFieldArray={itemsFieldArray}
      couponsFieldArray={couponsFieldArray}
      transactionItemSelect={{
        amount: 1,
        currentPage: 1,
        itemPerPage: 10,
        onAmountChange: fn(),
        onOptionValuesChange: fn(),
        onPageChange: fn(),
        onRetryButtonPress: fn(),
        onSearchValueChange: fn(),
        onSelectProduct: fn(),
        onSubmit: fn(),
        onUnselectProduct: fn(),
        products: mockProducts,
        searchValue: '',
        selectedOptionValues: [],
        totalItem: mockProducts.length,
        variant: { type: 'loaded' },
      }}
      couponList={{
        onItemPress: fn(),
        onRetryButtonPress: fn(),
        variant: { type: 'empty' },
      }}
      transactionPayment={{
        form: payForm,
        isButtonDisabled: false,
        onCancel: fn(),
        isOpen: false,
        onSubmit: fn(),
        transactionTotal: 0,
        walletSelectOptions: mockWallets.map((w) => ({ label: w.name, value: w })),
      }}
    />
  );
};

const meta: Meta<typeof TransactionCreateScreen> = {
  title: 'Screens/Transactions/TransactionCreateScreen',
  component: TransactionCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TransactionCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };

// Phase 6 (FR-6): at 360px with 10 items, the Total/Submit bar stays pinned
// to the bottom of the viewport instead of scrolling away with the form.
//
// The 640px/overflow="hidden" wrapper mimics the `height:100%;overflow:hidden`
// the running app sets on `body` (apps/web/src/pages/global.css) — Storybook's
// preview doesn't load that CSS, so without it Layout's ScrollView never
// becomes height-bound and the sticky bar has nothing to stick against, only
// in this harness (see TransactionFormView.tsx's Phase 6 comment).
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => (
    <YStack height={640} overflow="hidden">
      <CreateStory values={tenItemsDefaultValues} />
    </YStack>
  ),
};
