import { useFormikContext } from 'formik';
import { Button, ButtonProps } from 'tamagui';

export const SubmitButton = (props: ButtonProps) => {
  const formik = useFormikContext();
  return (
    <Button
      onPress={() => formik.submitForm()}
      disabled={formik.isSubmitting}
      theme="blue"
      {...props}
    >
      {props.children}
    </Button>
  );
};
