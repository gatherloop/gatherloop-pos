import { FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  SubmitButton,
  Select,
} from '../../../base';
import {
  UseProductFormStateProps,
  useProductFormState,
} from './ProductForm.state';

export type ProductFormProps = {
  variant: UseProductFormStateProps['variant'];
  onSuccess: () => void;
};

export const ProductForm = ({ variant, onSuccess }: ProductFormProps) => {
  const { formik, categories } = useProductFormState({ variant, onSuccess });
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="categoryId" label="Category">
          <Select
            items={categories.map((category) => ({
              label: category.name,
              value: String(category.id),
            }))}
            parseInputToFieldValue={parseInt}
            parseFieldToInputValue={String}
          />
        </Field>
        <Field name="price" label="Price">
          <InputNumber />
        </Field>
        <SubmitButton>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
