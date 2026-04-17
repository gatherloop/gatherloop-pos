import { ScrollView } from 'tamagui';
import { ChecklistTemplateFormView, Layout } from '../components';
import { ChecklistTemplateForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type ChecklistTemplateCreateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<ChecklistTemplateForm>;
  onSubmit: (values: ChecklistTemplateForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const ChecklistTemplateCreateScreen = ({
  onLogoutPress,
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
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
          form={form}
          onSubmit={onSubmit}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          serverError={serverError}
        />
      </ScrollView>
    </Layout>
  );
};
