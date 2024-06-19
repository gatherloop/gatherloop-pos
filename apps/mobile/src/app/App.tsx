import { ExampleScreen, tamaguiConfig } from '@gatherloop-pos/ui';
import { SafeAreaView } from 'react-native';
import { TamaguiProvider } from 'tamagui';

export const App = () => {
  return (
    <SafeAreaView>
      <TamaguiProvider config={tamaguiConfig}>
        <ExampleScreen />
      </TamaguiProvider>
    </SafeAreaView>
  );
};

export default App;
