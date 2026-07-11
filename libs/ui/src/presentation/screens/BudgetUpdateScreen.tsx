import { ScrollView } from 'tamagui';
import { BudgetFormView, Layout } from '../components';
import { BudgetForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';
import { BudgetFormViewProps } from '../components';

export type BudgetUpdateScreenProps = {
  form: UseFormReturn<BudgetForm>;
  onSubmit: (values: BudgetForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  variant: BudgetFormViewProps['variant'];
  serverError?: string;
};

export const BudgetUpdateScreen = (props: BudgetUpdateScreenProps) => {
  return (
    <Layout title="Update Budget" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <BudgetFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={props.variant}
          serverError={props.serverError}
        />
      </ScrollView>
    </Layout>
  );
};
