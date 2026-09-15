import { AlertDialog, Button, XStack, YStack } from 'tamagui';

export type OrderLeaveConfirmAlertProps = {
  isOpen: boolean;
  transactionNumber: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export const OrderLeaveConfirmAlert = ({
  isOpen,
  transactionNumber,
  onCancel,
  onConfirm,
}: OrderLeaveConfirmAlertProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel} modal>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          key="overlay"
          animation="fast"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <AlertDialog.Content
          bordered
          elevate
          key="content"
          animation={[
            'fast',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          x={0}
          scale={1}
          opacity={1}
          y={0}
        >
          <YStack gap="$5">
            <AlertDialog.Title>
              Pesanan #{transactionNumber} masih disiapkan
            </AlertDialog.Title>
            <AlertDialog.Description>
              Kalau Anda keluar dari halaman ini, scan ulang QR di meja untuk
              kembali ke sini.
            </AlertDialog.Description>

            <XStack gap="$3" justifyContent="flex-end">
              <AlertDialog.Cancel asChild>
                <Button>Tetap di sini</Button>
              </AlertDialog.Cancel>
              <Button theme="active" onPress={onConfirm}>
                Keluar
              </Button>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
};
