import { Button, Text, XStack, YStack } from 'tamagui';

export type PendingPaymentNoticeCancelAction = {
  label: string;
  onPress: () => void;
};

export type PendingPaymentNoticeProps = {
  onContinuePress: () => void;
  cancelAction: PendingPaymentNoticeCancelAction | null;
};

export const PendingPaymentNotice = ({
  onContinuePress,
  cancelAction,
}: PendingPaymentNoticeProps) => {
  return (
    <YStack
      gap="$2"
      padding="$3"
      backgroundColor="$background"
      borderColor="$borderColor"
      borderWidth="$1"
      theme="orange"
      borderRadius="$4"
      alignItems="center"
    >
      <Text color="$orange11" textAlign="center">
        Anda masih memiliki pembayaran yang belum selesai. Selesaikan atau
        batalkan dulu untuk mengubah pesanan.
      </Text>
      <XStack></XStack>
      <Button theme="blue" size="$5" onPress={onContinuePress}>
        Lanjutkan pembayaran
      </Button>
      {cancelAction ? (
        <Button
          size="$4"
          chromeless
          theme="red"
          color="$red10"
          onPress={cancelAction.onPress}
        >
          {cancelAction.label}
        </Button>
      ) : null}
    </YStack>
  );
};
