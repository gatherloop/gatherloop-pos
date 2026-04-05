import { CheckCircle, Circle, ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { Card, Paragraph, Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { useState } from 'react';
import { ChecklistSessionItem, ChecklistSessionSubItem } from '../../../domain';
import { ChecklistSessionSubItemRow } from './ChecklistSessionSubItemRow';

export type ChecklistSessionItemRowProps = {
  item: ChecklistSessionItem;
  onCheckItem: (itemId: number) => void;
  onUncheckItem: (itemId: number) => void;
  onCheckSubItem: (subItemId: number) => void;
  onUncheckSubItem: (subItemId: number) => void;
  togglingItemId: number | null;
  togglingSubItemId: number | null;
};

export function ChecklistSessionItemRow({
  item,
  onCheckItem,
  onUncheckItem,
  onCheckSubItem,
  onUncheckSubItem,
  togglingItemId,
  togglingSubItemId,
}: ChecklistSessionItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubItems = item.subItems.length > 0;
  const isCompleted = item.completedAt != null;
  const isToggling = togglingItemId === item.id;

  const completedSubItems = item.subItems.filter(
    (sub) => sub.completedAt != null
  ).length;
  const totalSubItems = item.subItems.length;

  return (
    <Card padding="$3" gap="$2">
      <XStack
        gap="$3"
        alignItems="center"
        onPress={() => {
          if (hasSubItems) {
            setIsExpanded((prev) => !prev);
          } else {
            if (isToggling) return;
            if (isCompleted) {
              onUncheckItem(item.id);
            } else {
              onCheckItem(item.id);
            }
          }
        }}
        pressStyle={{ opacity: 0.7 }}
      >
        {!hasSubItems && (
          isToggling ? (
            <Spinner size="small" />
          ) : isCompleted ? (
            <CheckCircle size="$3" color="$green10" />
          ) : (
            <Circle size="$3" color="$gray8" />
          )
        )}

        {hasSubItems && (
          <XStack
            backgroundColor={isCompleted ? '$green5' : '$gray5'}
            borderRadius="$2"
            paddingHorizontal="$2"
            paddingVertical="$1"
          >
            <Text fontSize="$2" fontWeight="bold">
              {completedSubItems}/{totalSubItems}
            </Text>
          </XStack>
        )}

        <YStack flex={1} gap="$1">
          <Text
            fontSize="$5"
            fontWeight="bold"
            textDecorationLine={isCompleted && !hasSubItems ? 'line-through' : 'none'}
            color={isCompleted && !hasSubItems ? '$gray9' : '$color'}
          >
            {item.name}
          </Text>
          {item.description && (
            <Paragraph fontSize="$3" color="$gray10">
              {item.description}
            </Paragraph>
          )}
          {isCompleted && !hasSubItems && item.completedAt && (
            <Paragraph fontSize="$2" color="$gray9">
              Completed at {new Date(item.completedAt).toLocaleTimeString()}
            </Paragraph>
          )}
        </YStack>

        {hasSubItems && (
          isExpanded ? <ChevronUp size="$1" /> : <ChevronDown size="$1" />
        )}
      </XStack>

      {hasSubItems && isExpanded && (
        <>
          <Separator />
          <YStack gap="$1">
            {item.subItems.map((subItem: ChecklistSessionSubItem) => (
              <ChecklistSessionSubItemRow
                key={subItem.id}
                subItem={subItem}
                onCheck={onCheckSubItem}
                onUncheck={onUncheckSubItem}
                isToggling={togglingSubItemId === subItem.id}
              />
            ))}
          </YStack>
        </>
      )}
    </Card>
  );
}
