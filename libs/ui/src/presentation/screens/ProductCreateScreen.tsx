import { ScrollView } from 'tamagui';
import {
  ProductFormView,
  ProductFormViewProps,
  productCreateFormResolver,
  Layout,
} from '../components';
import { ProductForm, Variant } from '../../domain';

export type ProductCreateScreenProps = {
  defaultValues: ProductForm;
  onSubmit: (values: ProductForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  variant: ProductFormViewProps['variant'];
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
          defaultValues={props.defaultValues}
          resolver={productCreateFormResolver}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={props.variant}
          categorySelectOptions={props.categorySelectOptions}
          variants={props.variants}
          serverError={props.serverError}
        />
      </ScrollView>
    </Layout>
  );
};
