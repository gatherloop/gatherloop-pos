import { ReactNode } from 'react';
import { YStack } from 'tamagui';
import { Layout } from '../components';

export type DashboardScreenProps = {
  onLogoutPress: () => void;
  children: ReactNode;
};

export const DashboardScreen = ({
  onLogoutPress,
  children,
}: DashboardScreenProps) => {
  return (
    <Layout onLogoutPress={onLogoutPress} title="Dashboard">
      <YStack gap="$5">{children}</YStack>
    </Layout>
  );
};
