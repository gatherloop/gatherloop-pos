import { ScrollView } from 'tamagui';
import {
  ChecklistTemplateFormView,
  ChecklistTemplateFormViewProps,
  Layout,
} from '../components';
import { ChecklistTemplateForm } from '../../domain';

export type ChecklistTemplateUpdateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: ChecklistTemplateForm;
  onSubmit: (values: ChecklistTemplateForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  variant: ChecklistTemplateFormViewProps['variant'];
  serverError?: string;
};

export const ChecklistTemplateUpdateScreen = ({
  onLogoutPress,
  defaultValues,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  variant,
  serverError,
}: ChecklistTemplateUpdateScreenProps) => {
  return (
    <Layout
      title="Update Checklist Template"
      showBackButton
      onLogoutPress={onLogoutPress}
    >
      <ScrollView>
        <ChecklistTemplateFormView
          defaultValues={defaultValues}
          onSubmit={onSubmit}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          variant={variant}
          serverError={serverError}
        />
      </ScrollView>
    </Layout>
  );
};
