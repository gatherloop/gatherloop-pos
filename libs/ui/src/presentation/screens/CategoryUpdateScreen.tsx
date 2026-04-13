import { ScrollView } from 'tamagui';
import {
  CategoryFormView,
  CategoryFormViewProps,
  Layout,
} from '../components';
import { CategoryForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type CategoryUpdateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<CategoryForm>;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: (values: CategoryForm) => void;
  variant: CategoryFormViewProps['variant'];
};

export const CategoryUpdateScreen = ({
  form,
  isSubmitDisabled,
  isSubmitting,
  onLogoutPress,
  onSubmit,
  variant,
}: CategoryUpdateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Update Category"
      showBackButton
    >
      <ScrollView>
        <CategoryFormView
          form={form}
          isSubmitDisabled={isSubmitDisabled}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          variant={variant}
        />
      </ScrollView>
    </Layout>
  );
};
