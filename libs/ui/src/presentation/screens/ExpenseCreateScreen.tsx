import { ScrollView } from 'tamagui';
import {
  ExpenseFormView,
  ExpenseFormViewProps,
  Layout,
} from '../components';
import { ExpenseForm } from '../../domain';

export type ExpenseCreateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: ExpenseForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: ExpenseForm) => void;
  budgetSelectOptions: { label: string; value: number }[];
  walletSelectOptions: { label: string; value: number }[];
  variant: ExpenseFormViewProps['variant'];
  serverError?: string;
};

export const ExpenseCreateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  budgetSelectOptions,
  walletSelectOptions,
  variant,
  serverError,
}: ExpenseCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Expense"
      showBackButton
    >
      <ScrollView>
        <ExpenseFormView
          defaultValues={defaultValues}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          budgetSelectOptions={budgetSelectOptions}
          walletSelectOptions={walletSelectOptions}
          variant={variant}
          serverError={serverError}
        />
      </ScrollView>
    </Layout>
  );
};
