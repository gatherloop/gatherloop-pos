import { ScrollView } from 'tamagui';
import {
  TagFormView,
  TagFormViewProps,
  Layout,
} from '../../components';
import { TagForm } from '../../../../domain';

export type TagUpdateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: TagForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: TagForm) => void;
  variant: TagFormViewProps['variant'];
  serverError?: string;
};

export const TagUpdateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: TagUpdateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Update Tag"
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
