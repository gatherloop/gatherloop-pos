import { Button, Paragraph, ScrollView, SizableText, Spinner, XStack, YStack } from 'tamagui';
import { Sheet } from '../base/Sheet';
import { EmptyView } from '../base';
import { AvailabilityMovement, AvailabilityMovementReason } from '../../../../domain';

const reasonLabels: Record<AvailabilityMovementReason, string> = {
  sale: 'Sale',
  sale_reversal: 'Sale reversed',
  manual_set: 'Set manually',
  manual_adjust: 'Adjusted manually',
  switched_off: 'Switched off',
  switched_on: 'Switched on',
};

function formatMovementDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export type AvailabilityMovementHistorySheetProps = {
  isOpen: boolean;
  title: string;
  variant: 'loading' | 'loaded' | 'error';
  movements: AvailabilityMovement[];
  errorMessage?: string;
  onClose: () => void;
  onRetryPress: () => void;
};

export const AvailabilityMovementHistorySheet = ({
  isOpen,
  title,
  variant,
  movements,
  errorMessage,
  onClose,
  onRetryPress,
}: AvailabilityMovementHistorySheetProps) => (
  <Sheet isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
    <YStack flex={1} padding="$4" gap="$3">
      <XStack alignItems="center" justifyContent="space-between">
        <SizableText fontWeight="600" size="$5" numberOfLines={1} flex={1}>
          {title}
        </SizableText>
        <Button size="$3" onPress={onClose} accessibilityLabel="Close">
          Close
        </Button>
      </XStack>

      {variant === 'loading' && (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" />
        </YStack>
      )}

      {variant === 'error' && (
        <EmptyView
          title="Failed to load history"
          subtitle={errorMessage ?? 'Please try again.'}
          actionLabel="Retry"
          onActionPress={onRetryPress}
        />
      )}

      {variant === 'loaded' &&
        (movements.length === 0 ? (
          <EmptyView title="No history yet" subtitle="No availability changes recorded." />
        ) : (
          <ScrollView flex={1}>
            <YStack gap="$2">
              {movements.map((movement) => (
                <YStack
                  key={movement.id}
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderRadius="$4"
                  padding="$3"
                  gap="$1"
                >
                  <XStack justifyContent="space-between" alignItems="center">
                    <SizableText fontWeight="600">
                      {reasonLabels[movement.reason]}
                    </SizableText>
                    <SizableText color="$gray10" size="$2">
                      {formatMovementDate(movement.createdAt)}
                    </SizableText>
                  </XStack>
                  {typeof movement.delta === 'number' && (
                    <Paragraph size="$3">
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                      {typeof movement.resultingQuantity === 'number' &&
                        ` → ${movement.resultingQuantity}`}
                    </Paragraph>
                  )}
                  {movement.note && <Paragraph size="$3">{movement.note}</Paragraph>}
                </YStack>
              ))}
            </YStack>
          </ScrollView>
        ))}
    </YStack>
  </Sheet>
);
