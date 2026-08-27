import { ScrollView } from 'tamagui';
import {
  CategoryFormView,
  CategoryFormViewProps,
  Layout,
} from '../components';
import { CategoryForm } from '../../domain';

export type CategoryUpdateScreenProps = {
  onLogoutPress: () => void;
  defaultValues: CategoryForm;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CategoryForm) => void;
  variant: CategoryFormViewProps['variant'];
  serverError?: string;
};

export const CategoryUpdateScreen = ({
  defaultValues,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
  serverError,
}: CategoryUpdateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Update Category"
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
