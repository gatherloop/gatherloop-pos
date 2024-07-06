import { useFormikContext } from 'formik';
import { Form as TamaguiForm } from 'tamagui';

export type FormProps = {
  children: React.ReactNode;
};

export const Form = (props: FormProps) => {
  const form = useFormikContext();
  return (
    <TamaguiForm onSubmit={form.handleSubmit} gap="$3">
      {props.children}
    </TamaguiForm>
  );
};
