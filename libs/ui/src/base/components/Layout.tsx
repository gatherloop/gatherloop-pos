import { XStack, YStack } from 'tamagui';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar/Navbar';

export type LayoutProps = {
  children: React.ReactNode;
  title: string;
  showBackButton?: boolean;
};

export const Layout = ({ children, title, showBackButton }: LayoutProps) => {
  return (
    <XStack flex={1}>
      <Sidebar />
      <YStack flex={1}>
        <Navbar title={title} showBackButton={showBackButton} />
        <YStack padding="$5" gap="$3" flex={1}>
          {children}
        </YStack>
      </YStack>
    </XStack>
  );
};
