import { ScrollView } from 'tamagui';
import { SupplierFormView, Layout } from '../components';
import { SupplierForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type SupplierCreateScreenProps = {
  form: UseFormReturn<SupplierForm>;
  onSubmit: (values: SupplierForm) => void;
  isSubmitDisabled: boolean;
  onLogoutPress: () => void;
};

export const SupplierCreateScreen = (props: SupplierCreateScreenProps) => {
  return (
    <Layout title="Create Supplier" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <SupplierFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
        />
      </ScrollView>
    </Layout>
  );
};
