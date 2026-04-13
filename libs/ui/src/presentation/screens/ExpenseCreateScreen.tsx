import { ScrollView } from 'tamagui';
import {
  ExpenseFormView,
  ExpenseFormViewProps,
  Layout,
} from '../components';
import { ExpenseForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type ExpenseCreateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<ExpenseForm>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: ExpenseForm) => void;
  onRetryButtonPress: () => void;
  budgetSelectOptions: { label: string; value: number }[];
  walletSelectOptions: { label: string; value: number }[];
  variant: ExpenseFormViewProps['variant'];
};

export const ExpenseCreateScreen = ({
  form,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onRetryButtonPress,
  onSubmit,
  budgetSelectOptions,
  walletSelectOptions,
  variant,
}: ExpenseCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Expense"
      showBackButton
    >
      <ScrollView>
        <ExpenseFormView
          form={form}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onRetryButtonPress={onRetryButtonPress}
          onSubmit={onSubmit}
          budgetSelectOptions={budgetSelectOptions}
          walletSelectOptions={walletSelectOptions}
          variant={variant}
        />
      </ScrollView>
    </Layout>
  );
};
