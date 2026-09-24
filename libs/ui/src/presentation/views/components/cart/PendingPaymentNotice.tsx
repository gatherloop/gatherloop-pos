import { Button, Text, YStack } from 'tamagui';

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
      backgroundColor="$orange3"
      borderRadius="$4"
      alignItems="center"
    >
      <Text color="$orange11" textAlign="center">
        Anda masih punya pembayaran yang belum selesai. Selesaikan atau
        batalkan dulu untuk mengubah pesanan.
      </Text>
      <Button
        theme="blue"
        size="$5"
        minHeight={44}
        width="100%"
        onPress={onContinuePress}
      >
        Lanjutkan pembayaran
      </Button>
      {cancelAction ? (
        <Button
          size="$2"
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
