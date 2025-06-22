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
  AuthLoginScreen,
  CalculationListScreen,
  CalculationCreateScreen,
  CalculationUpdateScreen,
} from '@gatherloop-pos/ui';
import { RootProvider } from '@gatherloop-pos/provider';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

export type RootStackParamList = {
  authLogin: undefined;
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
  calculationList: undefined;
  calculationCreate: undefined;
  calculationUpdate: { calculationId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const App = () => {
  return (
    <NavigationContainer
      linking={{
        prefixes: ['/'],
        config: {
          initialRouteName: 'dashboard',
          screens: {
            authLogin: 'auth/login',
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
            calculationList: 'calculations',
            calculationCreate: 'calculations/create',
            calculationUpdate: {
              path: 'calculations/:calculationId',
              parse: {
                calculationId: (calculationId) => parseInt(calculationId),
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
            name="authLogin"
            component={AuthLoginScreen}
            options={{ title: 'Login' }}
          />
          <Stack.Screen
            name="dashboard"
            component={TransactionStatisticScreen}
            options={{ title: 'Dashboard' }}
          />
          <Stack.Screen
            name="categoryList"
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'categoryList'>
            ) => <CategoryListScreen categoryListParams={{ categories: [] }} />}
          />
          <Stack.Screen
            name="categoryCreate"
            component={CategoryCreateScreen}
          />
          <Stack.Screen
            name="categoryUpdate"
            component={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'categoryUpdate'
              >
            ) => (
              <CategoryUpdateScreen
                categoryUpdateParams={{
                  category: null,
                  categoryId: props.route.params?.categoryId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="materialList"
            component={(
              props: NativeStackScreenProps<RootStackParamList, 'materialList'>
            ) => (
              <MaterialListScreen
                materialListParams={{
                  materials: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="materialCreate"
            component={MaterialCreateScreen}
          />
          <Stack.Screen
            name="materialUpdate"
            component={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'materialUpdate'
              >
            ) => (
              <MaterialUpdateScreen
                materialUpdateParams={{
                  material: null,
                  materialId: props.route.params?.materialId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="walletList"
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'walletList'>
            ) => (
              <WalletListScreen
                walletListParams={{
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen name="walletCreate" component={WalletCreateScreen} />
          <Stack.Screen
            name="walletUpdate"
            component={(
              props: NativeStackScreenProps<RootStackParamList, 'walletUpdate'>
            ) => (
              <WalletUpdateScreen
                walletUpdateParams={{
                  wallet: null,
                  walletId: props.route.params?.walletId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="walletTransferList"
            component={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'walletTransferList'
              >
            ) => (
              <WalletTransferListScreen
                walletDetailParams={{
                  wallet: null,
                  walletId: props.route.params.walletId,
                }}
                walletTransferListParams={{
                  walletId: props.route.params.walletId,
                  walletTransfers: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="walletTransferCreate"
            component={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'walletTransferCreate'
              >
            ) => (
              <WalletTransferCreateScreen
                walletTransferCreateParams={{
                  fromWalletId: props.route.params.walletId,
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="productList"
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'productList'>
            ) => (
              <ProductListScreen
                productListParams={{
                  products: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="productCreate"
            component={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'productCreate'
              >
            ) => (
              <ProductCreateScreen
                productCreateParams={{ categories: [] }}
                materialListParam={{
                  materials: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="productUpdate"
            component={(
              props: NativeStackScreenProps<RootStackParamList, 'productUpdate'>
            ) => (
              <ProductUpdateScreen
                productUpdateParams={{
                  categories: [],
                  product: null,
                  productId: props.route.params.productId,
                }}
                materialListParams={{
                  materials: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="budgetList"
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'budgetList'>
            ) => <BudgetListScreen budgetListParams={{ budgets: [] }} />}
          />
          <Stack.Screen
            name="transactionList"
            component={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'transactionList'
              >
            ) => (
              <TransactionListScreen
                transactionListParams={{ transactions: [], totalItem: 0 }}
                transactionPayParams={{ wallets: [] }}
              />
            )}
          />
          <Stack.Screen
            name="transactionCreate"
            component={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'transactionCreate'
              >
            ) => (
              <TransactionCreateScreen
                productListParams={{
                  products: [],
                  totalItem: 0,
                }}
                transactionPayParams={{
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="transactionUpdate"
            component={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'transactionUpdate'
              >
            ) => (
              <TransactionUpdateScreen
                productListParams={{
                  products: [],
                  totalItem: 0,
                }}
                transactionUpdateParams={{
                  transaction: null,
                  transactionId: props.route.params.transactionId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="transactionDetail"
            component={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'transactionDetail'
              >
            ) => (
              <TransactionDetailScreen
                transactionDetailParams={{
                  transaction: null,
                  transactionId: props.route.params.transactionId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="expenseList"
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'expenseList'>
            ) => (
              <ExpenseListScreen
                expenseListParams={{
                  expenses: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="expenseCreate"
            component={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'expenseCreate'
              >
            ) => (
              <ExpenseCreateScreen
                expenseCreateParams={{
                  budgets: [],
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="expenseUpdate"
            component={(
              props: NativeStackScreenProps<RootStackParamList, 'expenseUpdate'>
            ) => (
              <ExpenseUpdateScreen
                expenseUpdateParams={{
                  budgets: [],
                  expense: null,
                  expenseId: props.route.params.expenseId,
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="calculationList"
            component={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'calculationList'
              >
            ) => (
              <CalculationListScreen
                calculationListParams={{
                  calculations: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="calculationCreate"
            component={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'calculationCreate'
              >
            ) => (
              <CalculationCreateScreen
                calculationCreateParams={{ wallets: [] }}
              />
            )}
          />
          <Stack.Screen
            name="calculationUpdate"
            component={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'calculationUpdate'
              >
            ) => (
              <CalculationUpdateScreen
                calculationListParams={{
                  calculation: null,
                  calculationId: props.route.params.calculationId,
                  wallets: [],
                }}
              />
            )}
          />
        </Stack.Navigator>
      </RootProvider>
    </NavigationContainer>
  );
};

export default App;
