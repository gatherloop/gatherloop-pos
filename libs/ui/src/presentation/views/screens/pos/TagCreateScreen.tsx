import { ScrollView } from 'tamagui';
import {
  TagFormView,
  TagFormViewProps,
  Layout,
} from '../../components';
import { TagForm } from '../../../../domain';

export type TagCreateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: TagForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: TagForm) => void;
  variant: TagFormViewProps['variant'];
  serverError?: string;
};

export const TagCreateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: TagCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Tag"
      showBackButton
    >
      <ScrollView>
        <TagFormView
          defaultValues={defaultValues}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          variant={variant}
          serverError={serverError}
        />
      </ScrollView>
    </Layout>
  );
};
