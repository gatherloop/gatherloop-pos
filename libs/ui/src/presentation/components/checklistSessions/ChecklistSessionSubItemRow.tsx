import { Check } from '@tamagui/lucide-icons';
import { Checkbox, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui';
import { ChecklistSessionSubItem } from '../../../domain';

export type ChecklistSessionSubItemRowProps = {
  subItem: ChecklistSessionSubItem;
  onCheck: (subItemId: number) => void;
  onUncheck: (subItemId: number) => void;
  isToggling: boolean;
};

export function ChecklistSessionSubItemRow({
  subItem,
  onCheck,
  onUncheck,
  isToggling,
}: ChecklistSessionSubItemRowProps) {
  const isCompleted = subItem.completedAt != null;

  return (
    <XStack
      paddingLeft="$4"
      paddingVertical="$2"
      gap="$3"
      alignItems="center"
      onPress={() => {
        if (isToggling) return;
        if (isCompleted) {
          onUncheck(subItem.id);
        } else {
          onCheck(subItem.id);
        }
      }}
      pressStyle={{ opacity: 0.7 }}
    >
      {isToggling ? (
        <Spinner size="small" />
      ) : (
        <YStack pointerEvents="none">
          <Checkbox checked={isCompleted} size="$3">
            <Checkbox.Indicator>
              <Check />
            </Checkbox.Indicator>
          </Checkbox>
        </YStack>
      )}

      <YStack flex={1} gap="$1">
        <Text
          fontSize="$4"
          textDecorationLine={isCompleted ? 'line-through' : 'none'}
          color={isCompleted ? '$gray9' : '$color'}
        >
          {subItem.name}
        </Text>
        {isCompleted && subItem.completedAt && (
          <Paragraph fontSize="$2" color="$gray9">
            {new Date(subItem.completedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            })}
          </Paragraph>
        )}
      </YStack>
    </XStack>
  );
}
