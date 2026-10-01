import { Controller } from 'react-hook-form';
import { Button, XStack } from 'tamagui';
import { Check } from '@tamagui/lucide-icons';
import { useFieldContext } from '../base';
import { tagColors } from '../../../../domain';
import { tagColorBackground, tagColorLabels } from './tagColors';

export type TagColorPickerProps = {
  name?: string;
};

export const TagColorPicker = ({ name }: TagColorPickerProps) => {
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
          flexWrap="wrap"
        >
          {tagColors.map((color) => {
            const checked = field.value === color;
            return (
              <Button
                key={color}
                circular
                size="$3"
                accessibilityLabel={tagColorLabels[color]}
                backgroundColor={tagColorBackground(color)}
                borderWidth={checked ? 2 : 0}
                borderColor="$color12"
                icon={checked ? Check : undefined}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
                // @ts-expect-error type is a valid HTML attribute on the underlying button
                type="button"
                onPress={() => field.onChange(color)}
              />
            );
          })}
        </XStack>
      )}
    />
  );
};
