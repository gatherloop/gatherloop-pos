import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionItemSelect } from './TransactionItemSelect';
import {
  mockProducts,
  mockProduct,
  mockOptionValues,
} from '../../../../.storybook/mocks/mockData';
import type { Product } from '../../../domain';

// A product with enough options/values to exceed a phone screen's height,
// exercising the compact dialog's internal scroll (PRD FR-6).
const mockProductManyOptions: Product = {
  ...mockProduct,
  name: 'Build-Your-Own Bowl',
  options: [
    {
      id: 1,
      name: 'Base',
      values: [
        { id: 101, name: 'White Rice' },
        { id: 102, name: 'Brown Rice' },
        { id: 103, name: 'Quinoa' },
        { id: 104, name: 'Salad Greens' },
      ],
    },
    {
      id: 2,
      name: 'Protein',
      values: [
        { id: 201, name: 'Grilled Chicken' },
        { id: 202, name: 'Beef Teriyaki' },
        { id: 203, name: 'Tofu' },
        { id: 204, name: 'Salmon' },
      ],
    },
    {
      id: 3,
      name: 'Sauce',
      values: [
        { id: 301, name: 'Peanut' },
        { id: 302, name: 'Teriyaki' },
        { id: 303, name: 'Spicy Mayo' },
        { id: 304, name: 'Sesame' },
      ],
    },
    {
      id: 4,
      name: 'Toppings',
      values: [
        { id: 401, name: 'Avocado' },
        { id: 402, name: 'Edamame' },
        { id: 403, name: 'Seaweed' },
        { id: 404, name: 'Sesame Seeds' },
      ],
    },
    {
      id: 5,
      name: 'Spice Level',
      values: [
        { id: 501, name: 'Mild' },
        { id: 502, name: 'Medium' },
        { id: 503, name: 'Hot' },
      ],
    },
    {
      id: 6,
      name: 'Size',
      values: [
        { id: 601, name: 'Regular' },
        { id: 602, name: 'Large' },
      ],
    },
  ],
};

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

// Compact layout (PRD FR-3): autoFocus is disabled and the list reserves
// bottom padding for the floating cart button rendered by
// `TransactionFormView`.
export const CompactLoaded: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    variant: { type: 'loaded' },
  },
};

// Compact variant dialog (PRD FR-6): width follows the viewport instead of
// a fixed 500px, and Cancel/Submit stay reachable by scrolling the options
// area rather than growing past the screen.
export const CompactSelectingOptions: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    variant: { type: 'selectingOptions' },
    selectedProduct: mockProduct,
    selectedOptionValues: [],
  },
};

// A many-option product on a phone: the options list scrolls inside the
// dialog while Cancel/Submit remain pinned and reachable.
export const CompactSelectingOptionsManyOptions: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    variant: { type: 'selectingOptions' },
    selectedProduct: mockProductManyOptions,
    selectedOptionValues: [],
  },
};
