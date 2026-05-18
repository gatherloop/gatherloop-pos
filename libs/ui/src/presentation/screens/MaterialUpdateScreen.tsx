import { ScrollView } from 'tamagui';
import { MaterialFormView, Layout } from '../components';
import { MaterialForm, Supplier } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type MaterialUpdateScreenProps = {
  form: UseFormReturn<MaterialForm>;
  onSubmit: (values: MaterialForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
  suppliers: Supplier[];
  isLoadingSuppliers?: boolean;
};

export const MaterialUpdateScreen = (props: MaterialUpdateScreenProps) => {
  return (
    <Layout
      title="Update Material"
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
          suppliers={props.suppliers}
          isLoadingSuppliers={props.isLoadingSuppliers}
        />
      </ScrollView>
    </Layout>
  );
};
