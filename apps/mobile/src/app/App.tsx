import { tamaguiConfig, CategoryListScreen } from '@gatherloop-pos/ui';
import { SafeAreaView } from 'react-native';
import { ScrollView, TamaguiProvider } from 'tamagui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export const App = () => {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <SafeAreaView>
        <QueryClientProvider client={queryClient}>
          <ScrollView>
            <CategoryListScreen />
          </ScrollView>
        </QueryClientProvider>
      </SafeAreaView>
    </TamaguiProvider>
  );
};

export default App;
