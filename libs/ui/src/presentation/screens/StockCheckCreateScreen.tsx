import { ScrollView } from 'tamagui';
import { StockCheckFormView, Layout } from '../components';
import { StockCheckForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type StockCheckCreateScreenProps = {
  form: UseFormReturn<StockCheckForm>;
  onSubmit: (values: StockCheckForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
};

export const StockCheckCreateScreen = (props: StockCheckCreateScreenProps) => {
  return (
    <Layout
      title="Create Stock Check"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <StockCheckFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          serverError={props.serverError}
        />
      </ScrollView>
    </Layout>
  );
};
