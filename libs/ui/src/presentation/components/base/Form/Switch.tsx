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
          checked={field.value}
          onCheckedChange={field.onChange}
        >
          <TamaguiSwitch.Thumb animation="quicker" />
        </TamaguiSwitch>
      )}
    />
  );
};
