import {
  CategoryListScreen,
  CategoryCreateScreen,
  CategoryUpdateScreen,
  MaterialListScreen,
  MaterialCreateScreen,
  MaterialUpdateScreen,
  WalletListScreen,
  WalletCreateScreen,
  WalletUpdateScreen,
} from '@gatherloop-pos/ui';
import { RootProvider } from '@gatherloop-pos/provider';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<{
  home: undefined;
  categoryList: undefined;
  categoryCreate: undefined;
  categoryUpdate: { categoryId: number };
  materialList: undefined;
  materialCreate: undefined;
  materialUpdate: { materialId: number };
  walletList: undefined;
  walletCreate: undefined;
  walletUpdate: { walletId: number };
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
            materialList: 'materials',
            materialCreate: 'materials/create',
            materialUpdate: {
              path: 'materials/:materialId',
              parse: {
                materialId: (materialId) => parseInt(materialId),
              },
            },
            walletList: 'wallets',
            walletCreate: 'wallets/create',
            walletUpdate: {
              path: 'wallets/:walletId',
              parse: {
                walletId: (walletId) => parseInt(walletId),
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
          <Stack.Screen name="materialList" component={MaterialListScreen} />
          <Stack.Screen
            name="materialCreate"
            component={MaterialCreateScreen}
          />
          <Stack.Screen
            name="materialUpdate"
            component={MaterialUpdateScreen}
          />
          <Stack.Screen name="walletList" component={WalletListScreen} />
          <Stack.Screen name="walletCreate" component={WalletCreateScreen} />
          <Stack.Screen name="walletUpdate" component={WalletUpdateScreen} />
        </Stack.Navigator>
      </RootProvider>
    </NavigationContainer>
  );
};

export default App;
