import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Base/Pagination',
  component: Pagination,
  args: {
    currentPage: 1,
    itemPerPage: 10,
    totalItem: 100,
    onChangePage: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 10,
  },
};

export const FewPages: Story = {
  args: {
    currentPage: 1,
    totalItem: 25,
    itemPerPage: 10,
  },
};

export const SinglePage: Story = {
  args: {
    currentPage: 1,
    totalItem: 8,
    itemPerPage: 10,
  },
};

export const LargeDataset: Story = {
  args: {
    currentPage: 15,
    totalItem: 500,
    itemPerPage: 10,
  },
};
