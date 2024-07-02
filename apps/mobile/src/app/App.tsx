import {
  tamaguiConfig,
  CategoryListScreen,
  CategoryCreateScreen,
} from '@gatherloop-pos/ui';
import { TamaguiProvider } from 'tamagui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const queryClient = new QueryClient();

const Stack = createNativeStackNavigator<{
  home: undefined;
  categoryList: undefined;
  categoryCreate: undefined;
}>();

export const App = () => {
  return (
    <NavigationContainer
      linking={{
        prefixes: ['/'],
        config: {
          initialRouteName: 'home',
          screens: {
            home: '',
            categoryList: 'categories',
            categoryCreate: 'categories/create',
          },
        },
      }}
    >
      <TamaguiProvider config={tamaguiConfig}>
        <QueryClientProvider client={queryClient}>
          <Stack.Navigator
            initialRouteName="home"
            screenOptions={{ header: () => null }}
          >
            <Stack.Screen
              name="home"
              component={CategoryListScreen}
              options={{ title: 'Home' }}
            />
            <Stack.Screen name="categoryList" component={CategoryListScreen} />
            <Stack.Screen
              name="categoryCreate"
              component={CategoryCreateScreen}
            />
          </Stack.Navigator>
        </QueryClientProvider>
      </TamaguiProvider>
    </NavigationContainer>
  );
};

export default App;
