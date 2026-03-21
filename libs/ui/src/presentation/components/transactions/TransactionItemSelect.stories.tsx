import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionItemSelect } from './TransactionItemSelect';
import { mockProducts, mockProduct, mockOptionValues } from '../../../../.storybook/mocks/mockData';

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
