import { ScrollView } from 'tamagui';
import {
  CategoryFormView,
  CategoryFormViewProps,
  Layout,
} from '../components';
import { CategoryForm } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type CategoryCreateScreenProps = {
  onLogoutPress: () => void;
  form: UseFormReturn<CategoryForm>;
  isSubmitDisabled: boolean;
  onSubmit: (values: CategoryForm) => void;
  variant: CategoryFormViewProps['variant'];
};

export const CategoryCreateScreen = ({
  form,
  isSubmitDisabled,
  onLogoutPress,
  onSubmit,
  variant,
}: CategoryCreateScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Create Category"
      showBackButton
    >
      <ScrollView>
        <CategoryFormView
          form={form}
          isSubmitDisabled={isSubmitDisabled}
          onSubmit={onSubmit}
          variant={variant}
        />
      </ScrollView>
    </Layout>
  );
};
