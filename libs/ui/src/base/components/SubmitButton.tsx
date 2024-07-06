import { useFormikContext } from 'formik';
import { Button, ButtonProps } from 'tamagui';

export const SubmitButton = (props: ButtonProps) => {
  const formik = useFormikContext();
  return (
    <Button
      {...props}
      onPress={() => formik.submitForm()}
      disabled={formik.isSubmitting}
    >
      {props.children}
    </Button>
  );
};
