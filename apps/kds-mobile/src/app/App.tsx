import { useEffect, useState } from 'react';
import {
  getStoredAuthToken,
  registerAuthTokenInterceptor,
} from '@gatherloop-pos/ui';
import {
  AuthLogin,
  ExpoPushTokenRepository,
  KdsDeviceSetup,
} from '@gatherloop-pos/ui/kds';
import { RootProvider } from '@gatherloop-pos/provider';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = {
  authLogin: undefined;
  deviceSetup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const pushTokenRepository = new ExpoPushTokenRepository();

export const App = () => {
  const [initialRouteName, setInitialRouteName] = useState<
    'deviceSetup' | 'authLogin' | null
  >(null);

  useEffect(() => {
    const unregisterAuthTokenInterceptor = registerAuthTokenInterceptor();
    getStoredAuthToken().then((token) => {
      setInitialRouteName(token ? 'deviceSetup' : 'authLogin');
    });
    return unregisterAuthTokenInterceptor;
  }, []);

  if (initialRouteName === null) {
    return null;
  }

  return (
    <NavigationContainer<RootStackParamList>
      linking={{
        prefixes: ['/'],
        config: {
          initialRouteName,
          screens: {
            authLogin: 'login',
            deviceSetup: 'device-setup',
          },
        },
      }}
    >
      <RootProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="authLogin" component={AuthLogin} />
          <Stack.Screen
            name="deviceSetup"
            children={() => (
              <KdsDeviceSetup pushTokenRepository={pushTokenRepository} />
            )}
          />
        </Stack.Navigator>
      </RootProvider>
    </NavigationContainer>
  );
};

export default App;
