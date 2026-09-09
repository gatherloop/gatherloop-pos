import { useFormContext } from 'react-hook-form';
import { Paragraph } from 'tamagui';

export type ErrorMessageProps = {
  name: string;
};

export const ErrorMessage = ({ name }: ErrorMessageProps) => {
  const { formState } = useFormContext();
  return formState.errors[name]?.message ? (
    <Paragraph color="$red10">{formState.errors[name]?.message}</Paragraph>
  ) : null;
};
