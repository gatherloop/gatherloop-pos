import { ScrollView } from 'tamagui';
import { MaterialFormView, Layout } from '../components';
import { MaterialForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type MaterialUpdateScreenProps = {
  form: UseFormReturn<MaterialForm>;
  onSubmit: (values: MaterialForm) => void;
  isSubmitDisabled: boolean;
  onLogoutPress: () => void;
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
        />
      </ScrollView>
    </Layout>
  );
};
