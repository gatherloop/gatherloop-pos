import { ScrollView } from 'tamagui';
import {
  ExpenseFormView,
  ExpenseFormViewProps,
  Layout,
} from '../components';
import { ExpenseForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type ExpenseUpdateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<ExpenseForm>;
  isSubmitDisabled: boolean;
  onSubmit: (values: ExpenseForm) => void;
  onRetryButtonPress: () => void;
  budgetSelectOptions: { label: string; value: number }[];
  walletSelectOptions: { label: string; value: number }[];
  variant: ExpenseFormViewProps['variant'];
};

export const ExpenseUpdateScreen = ({
  form,
  isSubmitDisabled,
  onLogoutPress,
  onRetryButtonPress,
  onSubmit,
  budgetSelectOptions,
  walletSelectOptions,
  variant,
}: ExpenseUpdateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Update Expense"
      showBackButton
    >
      <ScrollView>
        <ExpenseFormView
          form={form}
          isSubmitDisabled={isSubmitDisabled}
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
