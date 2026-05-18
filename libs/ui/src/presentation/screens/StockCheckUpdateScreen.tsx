import { ScrollView } from 'tamagui';
import { StockCheckFormView, Layout } from '../components';
import { StockCheckForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type StockCheckUpdateScreenProps = {
  form: UseFormReturn<StockCheckForm>;
  onSubmit: (values: StockCheckForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
};

export const StockCheckUpdateScreen = (props: StockCheckUpdateScreenProps) => {
  return (
    <Layout
      title="Edit Stock Check"
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
