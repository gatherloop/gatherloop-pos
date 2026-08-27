import { ScrollView } from 'tamagui';
import { BudgetFormView, BudgetFormViewProps, Layout } from '../components';
import { BudgetForm } from '../../domain';

export type BudgetUpdateScreenProps = {
  defaultValues: BudgetForm;
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
          defaultValues={props.defaultValues}
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
