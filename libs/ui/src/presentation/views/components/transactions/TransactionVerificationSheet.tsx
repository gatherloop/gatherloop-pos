import dayjs from 'dayjs';
import {
  Button,
  Image,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { Sheet } from '../base/Sheet';
import { EmptyView } from '../base';
import { Transaction } from '../../../../domain';

export type TransactionVerificationSheetVariant =
  | 'loading'
  | 'shown'
  | 'approving'
  | 'confirmingReject'
  | 'rejecting'
  | 'gone'
  | 'error';

export type TransactionVerificationSheetProps = {
  isOpen: boolean;
  variant: TransactionVerificationSheetVariant;
  transaction: Transaction | null;
  photo: string | null;
  capturedAt: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onApprovePress: () => void;
  onRejectPress: () => void;
  onRejectCancel: () => void;
  onRejectConfirm: () => void;
};

export const TransactionVerificationSheet = ({
  isOpen,
  variant,
  transaction,
  photo,
  capturedAt,
  errorMessage,
  onClose,
  onApprovePress,
  onRejectPress,
  onRejectCancel,
  onRejectConfirm,
}: TransactionVerificationSheetProps) => {
  const isDeciding = variant === 'approving' || variant === 'rejecting';
  const isConfirmingReject =
    variant === 'confirmingReject' || variant === 'rejecting';

  return (
    <Sheet isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <YStack flex={1} padding="$4" gap="$3">
        <XStack alignItems="center" justifyContent="space-between">
          <SizableText fontWeight="600" size="$5" numberOfLines={1} flex={1}>
            {transaction
              ? `Verify Order #${transaction.transactionNumber}`
              : 'Verify Order'}
          </SizableText>
          <Button
            size="$3"
            onPress={onClose}
            accessibilityLabel="Close"
            disabled={isDeciding}
          >
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
            title="Failed to load verification"
            subtitle={errorMessage ?? 'Please try again.'}
            actionLabel="Close"
            onActionPress={onClose}
          />
        )}

        {variant === 'gone' && (
          <EmptyView
            title="Photo no longer available"
            subtitle="This order was already verified or cancelled."
            actionLabel="Close"
            onActionPress={onClose}
          />
        )}

        {(variant === 'shown' ||
          variant === 'approving' ||
          variant === 'confirmingReject' ||
          variant === 'rejecting') && (
          <ScrollView flex={1}>
            <YStack gap="$3">
              {transaction && (
                <YStack gap="$1">
                  <Paragraph size="$5" fontWeight="600">
                    {transaction.name}
                  </Paragraph>
                  {transaction.table && (
                    <Paragraph size="$3" color="$gray10">
                      Meja {transaction.table.label}
                    </Paragraph>
                  )}
                </YStack>
              )}

              {photo && (
                <Image
                  src={photo}
                  width="100%"
                  height={280}
                  borderRadius="$4"
                  objectFit="cover"
                />
              )}

              {capturedAt && (
                <Paragraph size="$2" color="$gray10">
                  Captured {dayjs(capturedAt).format('DD/MM/YYYY HH:mm')}
                </Paragraph>
              )}

              {transaction && (
                <YStack gap="$1">
                  {transaction.transactionItems.map((item) => (
                    <XStack key={item.id} justifyContent="space-between">
                      <Paragraph size="$3">
                        {item.amount}x {item.productName}
                      </Paragraph>
                      <Paragraph size="$3">
                        Rp. {item.subtotal.toLocaleString('id')}
                      </Paragraph>
                    </XStack>
                  ))}
                  <XStack
                    justifyContent="space-between"
                    paddingTop="$2"
                    borderTopWidth={1}
                    borderColor="$borderColor"
                  >
                    <Paragraph fontWeight="600">Total</Paragraph>
                    <Paragraph fontWeight="600">
                      Rp. {transaction.total.toLocaleString('id')}
                    </Paragraph>
                  </XStack>
                </YStack>
              )}

              {isConfirmingReject ? (
                <YStack
                  gap="$3"
                  paddingTop="$3"
                  borderTopWidth={1}
                  borderColor="$borderColor"
                >
                  <Paragraph>
                    {transaction
                      ? `Reject order #${transaction.transactionNumber}? The guest's order will be cancelled.`
                      : "Reject this order? The guest's order will be cancelled."}
                  </Paragraph>
                  <XStack gap="$3" justifyContent="flex-end">
                    <Button
                      disabled={variant === 'rejecting'}
                      onPress={onRejectCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      theme="red"
                      onPress={onRejectConfirm}
                      disabled={variant === 'rejecting'}
                      icon={variant === 'rejecting' ? <Spinner /> : undefined}
                    >
                      Reject
                    </Button>
                  </XStack>
                </YStack>
              ) : (
                <XStack gap="$3" justifyContent="flex-end" paddingTop="$3">
                  <Button
                    theme="red"
                    onPress={onRejectPress}
                    disabled={isDeciding}
                  >
                    Reject
                  </Button>
                  <Button
                    theme="active"
                    onPress={onApprovePress}
                    disabled={isDeciding}
                    icon={variant === 'approving' ? <Spinner /> : undefined}
                  >
                    Approve
                  </Button>
                </XStack>
              )}
            </YStack>
          </ScrollView>
        )}
      </YStack>
    </Sheet>
  );
};
