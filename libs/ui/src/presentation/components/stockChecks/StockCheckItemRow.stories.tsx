import type { Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { YStack } from 'tamagui';
import {
  StockCheckItemRow,
  StockCheckItemRowProps,
} from './StockCheckItemRow';

type FormValues = { currentStock: number | null };

const StockCheckItemRowStory = ({
  currentStock,
  ...rowProps
}: Omit<StockCheckItemRowProps, 'fieldName'> & {
  currentStock: number | null;
}) => {
  const form = useForm<FormValues>({ defaultValues: { currentStock } });
  return (
    <FormProvider {...form}>
      <YStack width={640} padding="$4">
        <StockCheckItemRow {...rowProps} fieldName="currentStock" />
      </YStack>
    </FormProvider>
  );
};

const meta: Meta<typeof StockCheckItemRow> = {
  title: 'Features/StockChecks/StockCheckItemRow',
  component: StockCheckItemRow,
};

export default meta;
type Story = StoryObj<typeof StockCheckItemRow>;

export const Filled: Story = {
  render: () => (
    <StockCheckItemRowStory
      materialName="Botol Kaca Bening 250 ml"
      purchaseUnit="Dus (24 Pcs)"
      inputId="stock-check-item-1"
      isPending={false}
      isErrorRow={false}
      hidden={false}
      currentStock={12}
    />
  ),
};

export const Pending: Story = {
  render: () => (
    <StockCheckItemRowStory
      materialName="Baking Soda"
      purchaseUnit="PCS (15 Gram)"
      inputId="stock-check-item-2"
      isPending={true}
      isErrorRow={false}
      hidden={false}
      currentStock={null}
    />
  ),
};

export const SubmittedError: Story = {
  render: () => (
    <StockCheckItemRowStory
      materialName="Baking Soda"
      purchaseUnit="PCS (15 Gram)"
      inputId="stock-check-item-3"
      isPending={true}
      isErrorRow={true}
      hidden={false}
      currentStock={null}
    />
  ),
};

export const Hidden: Story = {
  render: () => (
    <StockCheckItemRowStory
      materialName="Hidden by search or the pending filter"
      purchaseUnit="Dus (24 Pcs)"
      inputId="stock-check-item-4"
      isPending={false}
      isErrorRow={false}
      hidden={true}
      currentStock={5}
    />
  ),
};
