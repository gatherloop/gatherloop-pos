import { ScrollView, XStack, YStack } from 'tamagui';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export type LayoutProps = {
  children: React.ReactNode;
};

export const Layout = (props: LayoutProps) => {
  return (
    <XStack flex={1}>
      <Sidebar />
      <YStack flex={1}>
        <Navbar />
        <YStack padding="$5" gap="$3" flex={1}>
          {props.children}
        </YStack>
      </YStack>
    </XStack>
  );
};
