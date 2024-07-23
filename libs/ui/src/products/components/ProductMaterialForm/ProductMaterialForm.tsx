import { FormikProvider } from 'formik';
import { Field, Form, InputNumber, SubmitButton, Select } from '../../../base';
import {
  UseProductMaterialFormStateProps,
  useProductMaterialFormState,
} from './ProductMaterialForm.state';

export type ProductMaterialFormProps = {
  variant: UseProductMaterialFormStateProps['variant'];
  onSuccess: () => void;
};

export const ProductMaterialForm = ({
  variant,
  onSuccess,
}: ProductMaterialFormProps) => {
  const { formik, materials } = useProductMaterialFormState({
    variant,
    onSuccess,
  });
  return (
    <FormikProvider value={formik}>
      <Form>
        <Field name="materialId" label="Material">
          <Select
            items={materials.map((material) => ({
              label: `${material.name} per ${material.unit}`,
              value: String(material.id),
            }))}
            parseInputToFieldValue={parseInt}
            parseFieldToInputValue={String}
          />
        </Field>
        <Field name="amount" label="Amount">
          <InputNumber />
        </Field>
        <SubmitButton>Submit</SubmitButton>
      </Form>
    </FormikProvider>
  );
};
