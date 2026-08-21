import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';
import { fn } from '@storybook/test';
import { YStack } from 'tamagui';
import { TransactionItemSelect } from './TransactionItemSelect';
import {
  mockProducts,
  mockProduct,
  mockOptionValues,
} from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  products: mockProducts,
  selectedProduct: undefined,
  selectedOptionValues: [],
  onSelectProduct: fn(),
  onUnselectProduct: fn(),
  onOptionValuesChange: fn(),
  onSubmit: fn(),
  searchValue: '',
  onSearchValueChange: fn(),
  onRetryButtonPress: fn(),
  currentPage: 1,
  totalItem: 3,
  itemPerPage: 10,
  onPageChange: fn(),
  amount: 1,
  onAmountChange: fn(),
};

const meta: Meta<typeof TransactionItemSelect> = {
  title: 'Features/Transactions/TransactionItemSelect',
  component: TransactionItemSelect,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TransactionItemSelect>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
    products: [],
  },
};

export const Empty: Story = {
  args: {
    variant: { type: 'empty' },
    products: [],
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
    products: [],
  },
};

export const SelectingOptions: Story = {
  args: {
    variant: { type: 'selectingOptions' },
    selectedProduct: mockProduct,
    selectedOptionValues: [],
  },
};

export const Submitting: Story = {
  args: {
    variant: { type: 'submitting' },
    selectedProduct: mockProduct,
    selectedOptionValues: mockOptionValues,
    amount: 2,
  },
};

export const Submitted: Story = {
  args: {
    variant: { type: 'submited' },
    selectedProduct: mockProduct,
    selectedOptionValues: mockOptionValues,
    amount: 2,
  },
};

// Phase 7 of docs/prd-transaction-mobile-ux.md (FR-7): at 360px the picker
// needs a real bounded-height ancestor for its FlatList to fill (see the
// `TransactionCreateScreen`/`TransactionUpdateScreen` Phase 6 stories for
// why — Storybook's preview doesn't load the app's
// `body{height:100%;overflow:hidden}`, so this wrapper stands in for it).
const MobileWrapper = ({ children }: { children: ReactNode }) => (
  <YStack height={640} overflow="hidden">
    {children}
  </YStack>
);

export const MobileList: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    variant: { type: 'loaded' },
  },
  decorators: [
    (Story) => (
      <MobileWrapper>
        <Story />
      </MobileWrapper>
    ),
  ],
};

// FR-7: on `$xs` the option/amount step renders in `base/Sheet` (full height,
// full-width actions) instead of the desktop `Dialog`.
export const MobileSelectingOptions: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    variant: { type: 'selectingOptions' },
    selectedProduct: mockProduct,
    selectedOptionValues: mockOptionValues,
    amount: 2,
  },
  decorators: [
    (Story) => (
      <MobileWrapper>
        <Story />
      </MobileWrapper>
    ),
  ],
};
