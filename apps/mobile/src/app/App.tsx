import {
  CategoryListScreen,
  CategoryCreateScreen,
  CategoryUpdateScreen,
} from '@gatherloop-pos/ui';
import { RootProvider } from '@gatherloop-pos/provider';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<{
  home: undefined;
  categoryList: undefined;
  categoryCreate: undefined;
  categoryUpdate: { categoryId: number };
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
            categoryUpdate: {
              path: 'categories/:categoryId',
              parse: {
                categoryId: (categoryId) => parseInt(categoryId),
              },
            },
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
          <Stack.Screen
            name="categoryUpdate"
            component={CategoryUpdateScreen}
          />
        </Stack.Navigator>
      </RootProvider>
    </NavigationContainer>
  );
};

export default App;
