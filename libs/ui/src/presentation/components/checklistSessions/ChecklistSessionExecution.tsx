import { CheckCircle } from '@tamagui/lucide-icons';
import { Card, Paragraph, Text, XStack, YStack } from 'tamagui';
import { FlatList } from 'react-native';
import { match } from 'ts-pattern';
import { ChecklistSession, ChecklistSessionItem } from '../../../domain';
import { ChecklistSessionItemRow } from './ChecklistSessionItemRow';

export type ChecklistSessionExecutionProps = {
  onCheckItem: (itemId: number) => void;
  onUncheckItem: (itemId: number) => void;
  onCheckSubItem: (subItemId: number) => void;
  onUncheckSubItem: (subItemId: number) => void;
  togglingItemId: number | null;
  togglingSubItemId: number | null;
  onRetryButtonPress: () => void;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'loaded'; checklistSession: ChecklistSession };
};

function formatDate(dateStr: string): string {
  return dateStr.split('T')[0];
}

export const ChecklistSessionExecution = ({
  onCheckItem,
  onUncheckItem,
  onCheckSubItem,
  onUncheckSubItem,
  togglingItemId,
  togglingSubItemId,
  onRetryButtonPress,
  variant,
}: ChecklistSessionExecutionProps) => {
  return match(variant)
    .with({ type: 'loading' }, () => (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Text>Loading session...</Text>
      </YStack>
    ))
    .with({ type: 'error' }, () => (
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$3">
        <Text>Failed to load checklist session</Text>
        <Text onPress={onRetryButtonPress} color="$blue10">
          Retry
        </Text>
      </YStack>
    ))
    .with({ type: 'loaded' }, ({ checklistSession }) => {
      const completedItems = checklistSession.items.filter((item) => {
        if (item.subItems.length > 0) {
          return item.subItems.every((sub) => sub.completedAt != null);
        }
        return item.completedAt != null;
      }).length;
      const totalItems = checklistSession.items.length;
      const isSessionCompleted = checklistSession.completedAt != null;

      return (
        <YStack flex={1} gap="$3">
          {/* Progress header */}
          <Card padding="$3">
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap="$1">
                <Text fontSize="$6" fontWeight="bold">
                  {checklistSession.checklistTemplate?.name ?? 'Checklist'}
                </Text>
                <Paragraph fontSize="$3" color="$gray10">
                  {formatDate(checklistSession.date)}
                </Paragraph>
              </YStack>
              <XStack alignItems="center" gap="$2">
                {isSessionCompleted && (
                  <CheckCircle size="$2" color="$green10" />
                )}
                <Text fontSize="$5" fontWeight="bold"
                  color={isSessionCompleted ? '$green10' : '$color'}
                >
                  {completedItems}/{totalItems}
                </Text>
              </XStack>
            </XStack>
          </Card>

          {isSessionCompleted && (
            <Card padding="$3" backgroundColor="$green4">
              <XStack gap="$2" alignItems="center">
                <CheckCircle size="$2" color="$green10" />
                <Text color="$green10" fontWeight="bold">
                  All tasks completed!
                </Text>
              </XStack>
              {checklistSession.completedAt && (
                <Paragraph fontSize="$2" color="$green9" marginTop="$1">
                  Completed at{' '}
                  {new Date(checklistSession.completedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </Paragraph>
              )}
            </Card>
          )}

          {/* Items list */}
          <FlatList
            data={checklistSession.items.sort(
              (a: ChecklistSessionItem, b: ChecklistSessionItem) =>
                a.displayOrder - b.displayOrder
            )}
            keyExtractor={(item: ChecklistSessionItem) => item.id.toString()}
            renderItem={({ item }: { item: ChecklistSessionItem }) => (
              <ChecklistSessionItemRow
                item={item}
                onCheckItem={onCheckItem}
                onUncheckItem={onUncheckItem}
                onCheckSubItem={onCheckSubItem}
                onUncheckSubItem={onUncheckSubItem}
                togglingItemId={togglingItemId}
                togglingSubItemId={togglingSubItemId}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$2" />}
            nestedScrollEnabled
          />
        </YStack>
      );
    })
    .exhaustive();
};
