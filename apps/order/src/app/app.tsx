import { RootProvider } from '@gatherloop-pos/provider';
import { SessionProvider } from '@gatherloop-pos/ui/order';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';

export function App() {
  return (
    <RootProvider>
      <SessionProvider>
        <PlaceholderScreen />
      </SessionProvider>
    </RootProvider>
  );
}

export default App;
