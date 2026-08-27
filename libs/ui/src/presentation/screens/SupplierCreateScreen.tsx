import { ScrollView } from 'tamagui';
import { SupplierFormView, SupplierFormViewProps, Layout } from '../components';
import { SupplierForm } from '../../domain';

export type SupplierCreateScreenProps = {
  defaultValues: SupplierForm;
  onSubmit: (values: SupplierForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  variant: SupplierFormViewProps['variant'];
  serverError?: string;
};

export const SupplierCreateScreen = (props: SupplierCreateScreenProps) => {
  return (
    <Layout title="Create Supplier" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <SupplierFormView
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
