import { ScrollView } from 'tamagui';
import {
  CategoryFormView,
  CategoryFormViewProps,
  Layout,
} from '../components';
import { CategoryForm } from '../../domain';

export type CategoryCreateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: CategoryForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CategoryForm) => void;
  variant: CategoryFormViewProps['variant'];
  serverError?: string;
};

export const CategoryCreateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: CategoryCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Category"
      showBackButton
    >
      <ScrollView>
        <CategoryFormView
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
