import { AlertDialog, Button, ScrollView, XStack, YStack } from 'tamagui';
import { useWindowDimensions } from 'react-native';
import { useIsCompactLayout } from '../useIsCompactLayout';

export type ConfirmationAlertProps = {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isOpen: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onOpenChange: (isOpen: boolean) => void;
};

const ALERT_Z_INDEX = 100_001;

export const ConfirmationAlert = ({
  title,
  description,
  isOpen,
  onCancel,
  onConfirm,
  confirmText = 'Yes',
  cancelText = 'No',
  onOpenChange,
}: ConfirmationAlertProps) => {
  const isCompactLayout = useIsCompactLayout();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange} modal>
      <AlertDialog.Portal zIndex={ALERT_Z_INDEX}>
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
          width={isCompactLayout ? '90%' : undefined}
          maxWidth={isCompactLayout ? 420 : undefined}
          maxHeight={isCompactLayout ? '85%' : undefined}
        >
          <YStack gap="$3">
            {isCompactLayout ? (
              <ScrollView maxHeight={windowHeight * 0.5}>
                <YStack gap="$3">
                  <AlertDialog.Title>{title}</AlertDialog.Title>
                  <AlertDialog.Description>
                    {description}
                  </AlertDialog.Description>
                </YStack>
              </ScrollView>
            ) : (
              <>
                <AlertDialog.Title>{title}</AlertDialog.Title>
                <AlertDialog.Description>{description}</AlertDialog.Description>
              </>
            )}

            <XStack gap="$3" justifyContent="flex-end">
              <AlertDialog.Cancel asChild>
                <Button onPress={onCancel}>{cancelText}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button theme="active" onPress={onConfirm}>
                  {confirmText}
                </Button>
              </AlertDialog.Action>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  );
};
