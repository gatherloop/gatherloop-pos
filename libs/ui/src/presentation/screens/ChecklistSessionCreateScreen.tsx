import { ScrollView } from 'tamagui';
import { ChecklistSessionFormView, Layout } from '../components';
import { ChecklistSessionForm, ChecklistTemplate } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type ChecklistSessionCreateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<ChecklistSessionForm>;
  onSubmit: (values: ChecklistSessionForm) => void;
  isSubmitDisabled: boolean;
  checklistTemplates: ChecklistTemplate[];
};

export const ChecklistSessionCreateScreen = ({
  onLogoutPress,
  form,
  onSubmit,
  isSubmitDisabled,
  checklistTemplates,
}: ChecklistSessionCreateScreenProps) => {
  return (
    <Layout
      title="Start Checklist Session"
      showBackButton
      onLogoutPress={onLogoutPress}
    >
      <ScrollView>
        <ChecklistSessionFormView
          form={form}
          onSubmit={onSubmit}
          isSubmitDisabled={isSubmitDisabled}
          checklistTemplates={checklistTemplates}
        />
      </ScrollView>
    </Layout>
  );
};
