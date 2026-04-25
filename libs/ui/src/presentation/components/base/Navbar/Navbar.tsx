import { ArrowLeft } from '@tamagui/lucide-icons';
import { Button, H4, XStack } from 'tamagui';
import { useNavbarState } from './Navbar.state';
import { ReactNode } from 'react';

export type NavbarProps = {
  title: string;
  showBackButton?: boolean;
  rightActionItem?: ReactNode;
  leftActionItem?: ReactNode;
};

export const Navbar = ({
  title,
  showBackButton,
  rightActionItem,
  leftActionItem,
}: NavbarProps) => {
  const { onBackButtonPress } = useNavbarState();
  return (
    <XStack
      padding="$3"
      justifyContent="space-between"
      alignItems="center"
      backgroundColor="$gray1"
      $xs={{ flexDirection: 'column', alignItems: 'flex-start', gap: '$2' }}
    >
      <XStack alignItems="center" gap="$3" flex={1}>
        {leftActionItem}
        {showBackButton && (
          <Button
            icon={ArrowLeft}
            variant="outlined"
            circular
            onPress={onBackButtonPress}
            size="$3"
          />
        )}
        <H4 numberOfLines={1} ellipsizeMode="tail" flex={1}>
          {title}
        </H4>
      </XStack>
      {rightActionItem}
    </XStack>
  );
};
