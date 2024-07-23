import { ArrowLeft } from '@tamagui/lucide-icons';
import { Button, H4, XStack } from 'tamagui';
import { useNavbarState } from './Navbar.state';
import { ReactNode } from 'react';

export type NavbarProps = {
  title: string;
  showBackButton?: boolean;
  rightActionItem?: ReactNode;
};

export const Navbar = ({
  title,
  showBackButton,
  rightActionItem,
}: NavbarProps) => {
  const { onBackButtonPress } = useNavbarState();
  return (
    <XStack
      padding="$3"
      justifyContent="space-between"
      backgroundColor="$gray1"
    >
      <XStack alignItems="center" gap="$3">
        {showBackButton && (
          <Button
            icon={ArrowLeft}
            variant="outlined"
            circular
            onPress={onBackButtonPress}
            size="$3"
          />
        )}
        <H4>{title}</H4>
      </XStack>
      {rightActionItem}
    </XStack>
  );
};
