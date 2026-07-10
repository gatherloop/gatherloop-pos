import { ReactNode } from 'react';
import { ScrollView, YStack } from 'tamagui';
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
      <ScrollView>
        <YStack gap="$5">{children}</YStack>
      </ScrollView>
    </Layout>
  );
};
