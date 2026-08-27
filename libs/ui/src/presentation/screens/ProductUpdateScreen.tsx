import { ScrollView } from 'tamagui';
import {
  ProductFormView,
  ProductFormViewProps,
  productUpdateFormResolver,
  Layout,
  VariantDeleteAlert,
} from '../components';
import { ProductForm, Variant } from '../../domain';

export type ProductUpdateScreenProps = {
  defaultValues: ProductForm;
  onSubmit: (values: ProductForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  variant: ProductFormViewProps['variant'];
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
  serverError?: string;
};

export const ProductUpdateScreen = (props: ProductUpdateScreenProps) => {
  return (
    <Layout title="Update Product" showBackButton onLogoutPress={props.onLogoutPress}>
      <ScrollView>
        <ProductFormView
          defaultValues={props.defaultValues}
          resolver={productUpdateFormResolver}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={props.variant}
          categorySelectOptions={props.categorySelectOptions}
          variants={props.variants}
          onVariantPress={props.onVariantPress}
          onVariantDeleteMenuPress={props.onVariantDeleteMenuPress}
          onVariantEditMenuPress={props.onVariantEditMenuPress}
          onVariantCreatePress={props.onVariantCreatePress}
          serverError={props.serverError}
        />
        <VariantDeleteAlert {...props.variantDeleteAlert} />
      </ScrollView>
    </Layout>
  );
};
