import { YStack } from 'tamagui';
import { ReactNode } from 'react';

type ContentContainerProps = {
  children: ReactNode;
};

export const ContentContainer = ({ children }: ContentContainerProps) => (
  <YStack flex={1} width="100%" maxWidth={1440} alignSelf="center">
    {children}
  </YStack>
);
