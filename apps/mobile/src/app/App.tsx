import { CategoryListScreen, tamaguiConfig } from '@gatherloop-pos/ui';
import { SafeAreaView } from 'react-native';
import { ScrollView, TamaguiProvider } from 'tamagui';

export const App = () => {
  return (
    <SafeAreaView>
      <TamaguiProvider config={tamaguiConfig}>
        <ScrollView>
          <CategoryListScreen />
        </ScrollView>
      </TamaguiProvider>
    </SafeAreaView>
  );
};

export default App;
