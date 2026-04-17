import { ScrollView } from 'tamagui';
import { SupplierFormView, Layout } from '../components';
import { SupplierForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type SupplierUpdateScreenProps = {
  form: UseFormReturn<SupplierForm>;
  onSubmit: (values: SupplierForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  serverError?: string;
};

export const SupplierUpdateScreen = (props: SupplierUpdateScreenProps) => {
  return (
    <Layout title="Update Supplier" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <SupplierFormView
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
