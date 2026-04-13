import { ScrollView } from 'tamagui';
import { ProductFormView, Layout } from '../components';
import { ProductForm, Variant } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type ProductCreateScreenProps = {
  form: UseFormReturn<ProductForm>;
  onSubmit: (values: ProductForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onRetryButtonPress: () => void;
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  categorySelectOptions: { label: string; value: number }[];
  variants: Variant[];
  onLogoutPress: () => void;
  serverError?: string;
};

export const ProductCreateScreen = (props: ProductCreateScreenProps) => {
  return (
    <Layout title="Create Product" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <ProductFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          onRetryButtonPress={props.onRetryButtonPress}
          variant={props.variant}
          categorySelectOptions={props.categorySelectOptions}
          variants={props.variants}
          serverError={props.serverError}
        />
      </ScrollView>
    </Layout>
  );
};
