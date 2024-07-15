import { Check, ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { Select as TamaguiSelect, YStack } from 'tamagui';
import { LinearGradient } from 'tamagui/linear-gradient';
import { useFieldContext } from './Field';
import { useField as useFormikField } from 'formik';

export type SelectProps<FieldValue> = {
  name?: string;
  items: { label: string; value: FieldValue }[];
  parseInputToFieldValue: (inputValue: string) => FieldValue;
  parseFieldToInputValue: (fieldValue: FieldValue) => string;
};

export const Select = <FieldValue,>(props: SelectProps<FieldValue>) => {
  const { name } = useFieldContext();
  const fieldName = name ?? props.name ?? '';

  const [field, _meta, helpers] = useFormikField(fieldName);

  const onValueChange = (value: string) => {
    helpers.setValue(props.parseInputToFieldValue(value));
    helpers.setTouched(true);
  };

  return (
    <TamaguiSelect
      id={fieldName}
      name={fieldName}
      value={props.parseFieldToInputValue(field.value)}
      onValueChange={onValueChange}
      disablePreventBodyScroll
    >
      <TamaguiSelect.Trigger iconAfter={ChevronDown}>
        <TamaguiSelect.Value />
      </TamaguiSelect.Trigger>

      <TamaguiSelect.Content zIndex={200000}>
        <TamaguiSelect.ScrollUpButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronUp size={20} />
          </YStack>
          <LinearGradient
            start={[0, 0]}
            end={[0, 1]}
            fullscreen
            colors={['$background', 'transparent']}
            borderRadius="$4"
          />
        </TamaguiSelect.ScrollUpButton>

        <TamaguiSelect.Viewport
          animation="quick"
          animateOnly={['transform', 'opacity']}
          enterStyle={{ o: 0, y: -10 }}
          exitStyle={{ o: 0, y: 10 }}
          minWidth={200}
        >
          <TamaguiSelect.Group>
            {props.items.map((item, i) => (
              <TamaguiSelect.Item
                index={i}
                key={props.parseFieldToInputValue(item.value)}
                value={props.parseFieldToInputValue(item.value)}
              >
                <TamaguiSelect.ItemText>{item.label}</TamaguiSelect.ItemText>
                <TamaguiSelect.ItemIndicator marginLeft="auto">
                  <Check size={16} />
                </TamaguiSelect.ItemIndicator>
              </TamaguiSelect.Item>
            ))}
          </TamaguiSelect.Group>
        </TamaguiSelect.Viewport>

        <TamaguiSelect.ScrollDownButton
          alignItems="center"
          justifyContent="center"
          position="relative"
          width="100%"
          height="$3"
        >
          <YStack zIndex={10}>
            <ChevronDown size={20} />
          </YStack>
          <LinearGradient
            start={[0, 0]}
            end={[0, 1]}
            fullscreen
            colors={['transparent', '$background']}
            borderRadius="$4"
          />
        </TamaguiSelect.ScrollDownButton>
      </TamaguiSelect.Content>
    </TamaguiSelect>
  );
};
