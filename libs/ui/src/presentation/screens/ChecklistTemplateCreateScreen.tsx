import { ScrollView } from 'tamagui';
import {
  ChecklistTemplateFormView,
  ChecklistTemplateFormViewProps,
  Layout,
} from '../components';
import { ChecklistTemplateForm } from '../../domain';

export type ChecklistTemplateCreateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: ChecklistTemplateForm;
  onSubmit: (values: ChecklistTemplateForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  variant: ChecklistTemplateFormViewProps['variant'];
  serverError?: string;
};

export const ChecklistTemplateCreateScreen = ({
  onLogoutPress,
  defaultValues,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  variant,
  serverError,
}: ChecklistTemplateCreateScreenProps) => {
  return (
    <Layout
      title="Create Checklist Template"
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
