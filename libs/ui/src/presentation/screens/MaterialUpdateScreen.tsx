import { ScrollView } from 'tamagui';
import { MaterialFormView, MaterialFormViewProps, Layout } from '../components';
import { MaterialForm, Supplier } from '../../domain';

export type MaterialUpdateScreenProps = {
  defaultValues: MaterialForm;
  onSubmit: (values: MaterialForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  variant: MaterialFormViewProps['variant'];
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
          variant={props.variant}
          defaultValues={props.defaultValues}
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
