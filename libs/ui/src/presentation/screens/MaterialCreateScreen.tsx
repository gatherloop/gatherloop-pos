import { ScrollView } from 'tamagui';
import { MaterialFormView, Layout } from '../components';
import { MaterialForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type MaterialCreateScreenProps = {
  form: UseFormReturn<MaterialForm>;
  onSubmit: (values: MaterialForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
};

export const MaterialCreateScreen = (props: MaterialCreateScreenProps) => {
  return (
    <Layout
      title="Create Material"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <MaterialFormView
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
