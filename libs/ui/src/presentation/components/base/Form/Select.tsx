import { Check, ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import {
  Adapt,
  Select as TamaguiSelect,
  SelectTriggerProps as TamaguiSelectTriggerProps,
  YStack,
} from 'tamagui';
import { LinearGradient } from 'tamagui/linear-gradient';
import { useFieldContext } from './Field';
import { Sheet } from 'tamagui';
import { Controller } from 'react-hook-form';

export type SelectProps<FieldValue> = {
  name?: string;
  items: { label: string; value: FieldValue }[];
  onValueChange?: (value: FieldValue) => void;
} & TamaguiSelectTriggerProps;

export const Select = <FieldValue,>({
  name,
  items,
  ...selectProps
}: SelectProps<FieldValue>) => {
  const fieldContext = useFieldContext();
  const fieldName = fieldContext.name ?? name ?? '';
  return (
    <Controller
      name={fieldName}
      render={({ field }) => (
        <TamaguiSelect
          id={fieldName}
          name={fieldName}
          value={JSON.stringify(field.value)}
          onValueChange={(value) => {
            field.onChange(JSON.parse(value));
            selectProps.onValueChange?.(JSON.parse(value));
          }}
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
                    key={JSON.stringify(item.value)}
                    value={JSON.stringify(item.value)}
                  >
                    <TamaguiSelect.ItemText>
                      {item.label}
                    </TamaguiSelect.ItemText>
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
      )}
    />
  );
};
