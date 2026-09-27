import { Button, Paragraph, ScrollView, XStack, YStack } from 'tamagui';
import { ChevronLeft } from '@tamagui/lucide-icons';
import { Sheet } from '../base/Sheet';
import { CameraCapture } from '../base/CameraCapture';

export type CodPhotoCaptureSheetProps = {
  isOpen: boolean;
  onCapturePhoto: (photo: string) => void;
  onBackPress: () => void;
};

export const CodPhotoCaptureSheet = ({
  isOpen,
  onCapturePhoto,
  onBackPress,
}: CodPhotoCaptureSheetProps) => {
  return (
    <Sheet isOpen={isOpen} onOpenChange={(open) => !open && onBackPress()}>
      <YStack flex={1}>
        <XStack padding="$4" paddingBottom="$2" alignItems="center" gap="$2">
          <Button
            icon={ChevronLeft}
            chromeless
            size="$3"
            onPress={onBackPress}
            accessibilityLabel="Kembali"
          />
          <Paragraph fontWeight="bold" fontSize="$6">
            Foto verifikasi
          </Paragraph>
        </XStack>

        <ScrollView flex={1}>
          <YStack padding="$4" paddingTop="$0">
            <CameraCapture onCapture={onCapturePhoto} />
          </YStack>
        </ScrollView>
      </YStack>
    </Sheet>
  );
};
