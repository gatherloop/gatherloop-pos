import { ReactNode } from 'react';
import { YStack } from 'tamagui';
import { Platform } from 'react-native';

export type PinnedActionBarProps = {
  children: ReactNode;
};

export const PinnedActionBar = ({ children }: PinnedActionBarProps) => {
  return (
    <YStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      padding="$3"
      paddingBottom={
        Platform.OS === 'web' ? 'env(safe-area-inset-bottom, 13px)' : '$3'
      }
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$borderColor"
    >
      {children}
    </YStack>
  );
};
