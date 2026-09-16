import { Receipt } from '@tamagui/lucide-icons';
import { Button, Image, Text, XStack, YStack } from 'tamagui';
import { ORDER_BRAND_LOGO_URI, ORDER_BRAND_NAME } from '../../../../utils/brand';

export type OrderBrandHeaderProps = {
  logoUri?: string;
  tableLine?: string;
  onHistoryPress?: () => void;
};

export const OrderBrandHeader = ({
  logoUri = ORDER_BRAND_LOGO_URI,
  tableLine,
  onHistoryPress,
}: OrderBrandHeaderProps) => {
  return (
    <XStack
      padding="$4"
      gap="$3"
      alignItems="center"
      backgroundColor="$color2"
      borderBottomWidth={1}
      borderColor="$borderColor"
    >
      <Image src={logoUri} width={36} height={36} borderRadius="$3" />
      <YStack flex={1}>
        <Text fontWeight="bold" numberOfLines={1}>
          {ORDER_BRAND_NAME}
        </Text>
        {tableLine ? (
          <Text color="$color10" numberOfLines={1}>
            {tableLine}
          </Text>
        ) : null}
      </YStack>
      {onHistoryPress ? (
        <Button
          icon={Receipt}
          variant="outlined"
          circular
          width={44}
          height={44}
          onPress={onHistoryPress}
          accessibilityLabel="Pesanan Saya"
        />
      ) : null}
    </XStack>
  );
};
