import { ScrollView } from 'tamagui';
import { BudgetFormView, Layout } from '../components';
import { BudgetForm } from '../../domain';

export type BudgetCreateScreenProps = {
  defaultValues: BudgetForm;
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
          defaultValues={props.defaultValues}
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
