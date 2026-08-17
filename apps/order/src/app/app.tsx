import { RootProvider } from '@gatherloop-pos/provider';
import { Router, RouteConfig } from '../router/Router';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';

const routes: RouteConfig[] = [{ path: '/', element: () => <PlaceholderScreen /> }];

export function App() {
  return (
    <RootProvider>
      <Router routes={routes} notFound={<PlaceholderScreen />} />
    </RootProvider>
  );
}

export default App;
