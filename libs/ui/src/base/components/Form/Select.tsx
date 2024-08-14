import { Check, ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import {
  Adapt,
  Select as TamaguiSelect,
  SelectTriggerProps as TamaguiSelectTriggerProps,
  YStack,
} from 'tamagui';
import { LinearGradient } from 'tamagui/linear-gradient';
import { useFieldContext } from './Field';
import { useField as useFormikField } from 'formik';
import { Sheet } from 'tamagui';

export type SelectProps<FieldValue> = {
  name?: string;
  items: { label: string; value: FieldValue }[];
  parseInputToFieldValue: (inputValue: string) => FieldValue;
  parseFieldToInputValue: (fieldValue: FieldValue) => string;
} & TamaguiSelectTriggerProps;

export const Select = <FieldValue,>({
  name,
  items,
  parseFieldToInputValue,
  parseInputToFieldValue,
  ...selectProps
}: SelectProps<FieldValue>) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';

  const [field, _meta, helpers] = useFormikField(fieldName);

  const onValueChange = (value: string) => {
    helpers.setValue(parseInputToFieldValue(value));
    helpers.setTouched(true);
  };

  return (
    <TamaguiSelect
      id={fieldName}
      name={fieldName}
      value={parseFieldToInputValue(field.value)}
      onValueChange={onValueChange}
      disablePreventBodyScroll
    >
      <TamaguiSelect.Trigger iconAfter={ChevronDown} {...selectProps}>
        <TamaguiSelect.Value />
      </TamaguiSelect.Trigger>

      <Adapt platform="touch">
        <Sheet
          modal
          dismissOnSnapToBottom
          animationConfig={{
            type: 'spring',
            damping: 20,
            mass: 1.2,
            stiffness: 250,
          }}
        >
          <Sheet.Frame>
            <Sheet.ScrollView>
              <Adapt.Contents />
            </Sheet.ScrollView>
          </Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
        </Sheet>
      </Adapt>

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
          animation="fast"
          animateOnly={['transform', 'opacity']}
          enterStyle={{ o: 0, y: -10 }}
          exitStyle={{ o: 0, y: 10 }}
          minWidth={200}
        >
          <TamaguiSelect.Group>
            {items.map((item, i) => (
              <TamaguiSelect.Item
                index={i}
                key={parseFieldToInputValue(item.value)}
                value={parseFieldToInputValue(item.value)}
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
