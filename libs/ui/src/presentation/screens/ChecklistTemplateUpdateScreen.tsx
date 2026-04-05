import { ScrollView } from 'tamagui';
import { ChecklistTemplateFormView, Layout, LoadingView, ErrorView } from '../components';
import { ChecklistTemplateForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';
import { match } from 'ts-pattern';

export type ChecklistTemplateUpdateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<ChecklistTemplateForm>;
  onSubmit: (values: ChecklistTemplateForm) => void;
  isSubmitDisabled: boolean;
  onRetryButtonPress: () => void;
  variant: { type: 'loading' } | { type: 'loaded' } | { type: 'error' };
};

export const ChecklistTemplateUpdateScreen = ({
  onLogoutPress,
  form,
  onSubmit,
  isSubmitDisabled,
  onRetryButtonPress,
  variant,
}: ChecklistTemplateUpdateScreenProps) => {
  return (
    <Layout
      title="Update Checklist Template"
      showBackButton
      onLogoutPress={onLogoutPress}
    >
      {match(variant)
        .with({ type: 'loading' }, () => (
          <LoadingView title="Fetching Checklist Template..." />
        ))
        .with({ type: 'error' }, () => (
          <ErrorView
            title="Failed to Fetch Checklist Template"
            subtitle="Please click the retry button to refetch data"
            onRetryButtonPress={onRetryButtonPress}
          />
        ))
        .with({ type: 'loaded' }, () => (
          <ScrollView>
            <ChecklistTemplateFormView
              form={form}
              onSubmit={onSubmit}
              isSubmitDisabled={isSubmitDisabled}
            />
          </ScrollView>
        ))
        .exhaustive()}
    </Layout>
  );
};
