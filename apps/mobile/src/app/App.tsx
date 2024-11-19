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
  ProductListScreen,
  ProductCreateScreen,
  ProductUpdateScreen,
  BudgetListScreen,
  WalletTransferListScreen,
  WalletTransferCreateScreen,
  TransactionListScreen,
  TransactionCreateScreen,
  TransactionUpdateScreen,
  TransactionDetailScreen,
  ExpenseListScreen,
  ExpenseCreateScreen,
  ExpenseUpdateScreen,
  TransactionStatisticScreen,
  TransactionPrintScreen,
} from '@gatherloop-pos/ui';
import { RootProvider } from '@gatherloop-pos/provider';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<{
  dashboard: undefined;
  categoryList: undefined;
  categoryCreate: undefined;
  categoryUpdate: { categoryId: number };
  materialList: undefined;
  materialCreate: undefined;
  materialUpdate: { materialId: number };
  walletList: undefined;
  walletCreate: undefined;
  walletUpdate: { walletId: number };
  walletTransferList: { walletId: number };
  walletTransferCreate: { walletId: number };
  productList: undefined;
  productCreate: undefined;
  productUpdate: { productId: number };
  budgetList: undefined;
  budgetCreate: undefined;
  budgetUpdate: { budgetId: number };
  transactionList: undefined;
  transactionCreate: undefined;
  transactionUpdate: { transactionId: number };
  transactionDetail: { transactionId: number };
  transactionPrint: { transactionId: number };
  expenseList: undefined;
  expenseCreate: undefined;
  expenseUpdate: { expenseId: number };
}>();

export const App = () => {
  return (
    <NavigationContainer
      linking={{
        prefixes: ['/'],
        config: {
          initialRouteName: 'dashboard',
          screens: {
            dashboard: '',
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
            walletTransferList: {
              path: 'wallets/:walletId/transfers',
              parse: {
                walletId: (walletId) => parseInt(walletId),
              },
            },
            walletTransferCreate: {
              path: 'wallets/:walletId/transfers/create',
              parse: {
                walletId: (walletId) => parseInt(walletId),
              },
            },
            productList: 'products',
            productCreate: 'products/create',
            productUpdate: {
              path: 'products/:productId',
              parse: {
                productId: (productId) => parseInt(productId),
              },
            },
            budgetList: 'budgets',
            transactionList: 'transactions',
            transactionCreate: 'transactions/create',
            transactionUpdate: {
              path: 'transactions/:transactionId',
              parse: {
                transactionId: (transactionId) => parseInt(transactionId),
              },
            },
            transactionDetail: {
              path: 'transactions/:transactionId/detail',
              parse: {
                transactionId: (transactionId) => parseInt(transactionId),
              },
            },
            transactionPrint: {
              path: 'transactions/:transactionId/print',
              parse: {
                transactionId: (transactionId) => parseInt(transactionId),
              },
            },
            expenseList: 'expenses',
            expenseCreate: 'expenses/create',
            expenseUpdate: {
              path: 'expenses/:expenseId',
              parse: {
                expenseId: (expenseId) => parseInt(expenseId),
              },
            },
          },
        },
      }}
    >
      <RootProvider>
        <Stack.Navigator
          initialRouteName="dashboard"
          screenOptions={{ header: () => null }}
        >
          <Stack.Screen
            name="dashboard"
            component={TransactionStatisticScreen}
            options={{ title: 'Dashboard' }}
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
          <Stack.Screen
            name="walletTransferList"
            component={WalletTransferListScreen}
          />
          <Stack.Screen
            name="walletTransferCreate"
            component={WalletTransferCreateScreen}
          />
          <Stack.Screen name="productList" component={ProductListScreen} />
          <Stack.Screen name="productCreate" component={ProductCreateScreen} />
          <Stack.Screen name="productUpdate" component={ProductUpdateScreen} />
          <Stack.Screen name="budgetList" component={BudgetListScreen} />
          <Stack.Screen
            name="transactionList"
            component={TransactionListScreen}
          />
          <Stack.Screen
            name="transactionCreate"
            component={TransactionCreateScreen}
          />
          <Stack.Screen
            name="transactionUpdate"
            component={TransactionUpdateScreen}
          />
          <Stack.Screen
            name="transactionDetail"
            component={TransactionDetailScreen}
          />
          <Stack.Screen
            name="transactionPrint"
            component={TransactionPrintScreen}
          />
          <Stack.Screen name="expenseList" component={ExpenseListScreen} />
          <Stack.Screen name="expenseCreate" component={ExpenseCreateScreen} />
          <Stack.Screen name="expenseUpdate" component={ExpenseUpdateScreen} />
        </Stack.Navigator>
      </RootProvider>
    </NavigationContainer>
  );
};

export default App;
