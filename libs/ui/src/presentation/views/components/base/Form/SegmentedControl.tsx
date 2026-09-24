import { Button, XStack, XStackProps } from 'tamagui';
import { useFieldContext } from './Field';
import { Controller } from 'react-hook-form';

export type SegmentedControlProps<FieldValue extends string> = {
  name?: string;
  items: { label: string; value: FieldValue }[];
  onValueChange?: (value: FieldValue) => void;
} & XStackProps;

export const SegmentedControl = <FieldValue extends string>({
  name,
  items,
  onValueChange,
  ...xStackProps
}: SegmentedControlProps<FieldValue>) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';
  return (
    <Controller
      name={fieldName}
      render={({ field }) => (
        <XStack
          id={fieldName}
          accessibilityRole="radiogroup"
          gap="$2"
          {...xStackProps}
        >
          {items.map((item) => {
            const checked = field.value === item.value;
            return (
              <Button
                key={item.value}
                flex={1}
                theme={checked ? 'blue' : undefined}
                variant={checked ? undefined : 'outlined'}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
                // Button renders a native <button>; without this it defaults to
                // type="submit" and selecting a segment inside a <Form> submits early.
                // @ts-expect-error type is a valid HTML attribute on the underlying button
                type="button"
                onPress={() => {
                  field.onChange(item.value);
                  onValueChange?.(item.value);
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </XStack>
      )}
    />
  );
};
