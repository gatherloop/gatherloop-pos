import { CategoryListScreen, CategoryCreateScreen } from '@gatherloop-pos/ui';
import { RootProvider } from '@gatherloop-pos/provider';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
      <RootProvider>
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
      </RootProvider>
    </NavigationContainer>
  );
};

export default App;
