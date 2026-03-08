import { ScrollView } from 'tamagui';
import { ProductFormView, Layout, VariantDeleteAlert } from '../components';
import { ProductForm, Variant } from '../../domain';
import { UseFormReturn } from 'react-hook-form';

export type ProductUpdateScreenProps = {
  form: UseFormReturn<ProductForm>;
  onSubmit: (values: ProductForm) => void;
  isSubmitDisabled: boolean;
  onRetryButtonPress: () => void;
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  categorySelectOptions: { label: string; value: number }[];
  variants: Variant[];
  onVariantDeleteMenuPress: (variant: Variant) => void;
  onVariantEditMenuPress: (variant: Variant) => void;
  onVariantPress: (variant: Variant) => void;
  onVariantCreatePress: () => void;
  variantDeleteAlert: {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    isButtonDisabled: boolean;
  };
  onLogoutPress: () => void;
};

export const ProductUpdateScreen = (props: ProductUpdateScreenProps) => {
  return (
    <Layout title="Update Product" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <ProductFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          onRetryButtonPress={props.onRetryButtonPress}
          variant={props.variant}
          categorySelectOptions={props.categorySelectOptions}
          variants={props.variants}
          onVariantPress={props.onVariantPress}
          onVariantDeleteMenuPress={props.onVariantDeleteMenuPress}
          onVariantEditMenuPress={props.onVariantEditMenuPress}
          onVariantCreatePress={props.onVariantCreatePress}
        />
        <VariantDeleteAlert {...props.variantDeleteAlert} />
      </ScrollView>
    </Layout>
  );
};
