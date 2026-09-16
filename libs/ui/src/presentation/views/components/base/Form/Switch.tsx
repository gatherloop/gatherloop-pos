import {
  Switch as TamaguiSwitch,
  SwitchProps as TamaguiSwitchProps,
} from 'tamagui';
import { useFieldContext } from './Field';
import { Controller } from 'react-hook-form';

export type SwitchProps = {
  name?: string;
} & TamaguiSwitchProps;

export const Switch = ({ name, ...switchProps }: SwitchProps) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';
  return (
    <Controller
      name={fieldName}
      render={({ field }) => (
        <TamaguiSwitch
          {...switchProps}
          id={field.name}
          name={field.name}
          // Switch renders a native <button>; without this it defaults to
          // type="submit" and toggling it inside a <Form> submits early.
          // @ts-expect-error type is a valid HTML attribute on the underlying button
          type="button"
          checked={field.value}
          onCheckedChange={field.onChange}
        >
          <TamaguiSwitch.Thumb animation="quicker" />
        </TamaguiSwitch>
      )}
    />
  );
};
