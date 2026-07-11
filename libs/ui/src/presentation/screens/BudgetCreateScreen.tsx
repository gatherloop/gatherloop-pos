import { ScrollView } from 'tamagui';
import { BudgetFormView, Layout } from '../components';
import { BudgetForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type BudgetCreateScreenProps = {
  form: UseFormReturn<BudgetForm>;
  onSubmit: (values: BudgetForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
};

export const BudgetCreateScreen = (props: BudgetCreateScreenProps) => {
  return (
    <Layout title="Create Budget" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <BudgetFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={{ type: 'loaded' }}
          serverError={props.serverError}
        />
      </ScrollView>
    </Layout>
  );
};
