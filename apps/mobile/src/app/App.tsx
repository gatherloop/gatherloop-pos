import {
  CategoryList,
  CategoryCreate,
  CategoryUpdate,
  MaterialList,
  MaterialCreate,
  MaterialUpdate,
  WalletList,
  WalletCreate,
  WalletUpdate,
  ProductList,
  ProductCreate,
  ProductUpdate,
  VariantList,
  VariantCreate,
  VariantUpdate,
  BudgetList,
  BudgetCreate,
  BudgetUpdate,
  WalletTransferList,
  WalletTransferCreate,
  TransactionList,
  TransactionCreate,
  TransactionUpdate,
  TransactionDetail,
  ExpenseList,
  ExpenseCreate,
  ExpenseUpdate,
  DashboardApp,
  DEFAULT_TRANSACTION_STATISTIC_PRESET,
  DEFAULT_EXPENSE_STATISTIC_PRESET,
  DEFAULT_EXPENSE_STATISTIC_VIEW,
  getDateRangeForPreset,
  AuthLogin,
  CalculationList,
  CalculationCreate,
  CalculationUpdate,
  CouponList,
  CouponCreate,
  CouponUpdate,
  TicketList,
  TicketCreate,
  TicketUpdate,
  RentalList,
  RentalCheckin,
  RentalCheckout,
  SupplierList,
  SupplierCreate,
  SupplierUpdate,
  ChecklistTemplateList,
  ChecklistTemplateCreate,
  ChecklistTemplateUpdate,
  ChecklistSessionList,
  ChecklistSessionDetail,
  getStoredAuthToken,
  registerAuthTokenInterceptor,
} from '@gatherloop-pos/ui';
import { RootProvider } from '@gatherloop-pos/provider';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';

export type RootStackParamList = {
  authLogin: undefined;
  dashboard: undefined;
  categoryList: undefined;
  categoryCreate: undefined;
  categoryUpdate: { categoryId: number };
  couponList: undefined;
  couponCreate: undefined;
  couponUpdate: { couponId: number };
  ticketList: undefined;
  ticketCreate: undefined;
  ticketUpdate: { ticketId: number };
  materialList: undefined;
  materialCreate: undefined;
  materialUpdate: { materialId: number };
  supplierList: undefined;
  supplierCreate: undefined;
  supplierUpdate: { supplierId: number };
  walletList: undefined;
  walletCreate: undefined;
  walletUpdate: { walletId: number };
  walletTransferList: { walletId: number };
  walletTransferCreate: { walletId: number };
  productList: undefined;
  productCreate: undefined;
  productUpdate: { productId: number };
  variantList: undefined;
  variantCreate: { productId: number };
  variantUpdate: { productId: number; variantId: number };
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
  rentalList: undefined;
  rentalCheckin: undefined;
  rentalCheckout: undefined;
  checklistTemplateList: undefined;
  checklistTemplateCreate: undefined;
  checklistTemplateUpdate: { checklistTemplateId: number };
  checklistSessionList: undefined;
  checklistSessionCreate: undefined;
  checklistSessionDetail: { checklistSessionId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const App = () => {
  // Native has no server-rendered guard like the web app's
  // getServerSideProps cookie check, so on cold start there is nothing
  // stopping the app from landing straight on the dashboard: check for a
  // stored session token before picking the first screen, and register the
  // interceptor that attaches it to every request before any screen can
  // issue one.
  const [initialRouteName, setInitialRouteName] = useState<
    'dashboard' | 'authLogin' | null
  >(null);

  useEffect(() => {
    const unregisterAuthTokenInterceptor = registerAuthTokenInterceptor();
    getStoredAuthToken().then((token) => {
      setInitialRouteName(token ? 'dashboard' : 'authLogin');
    });
    return unregisterAuthTokenInterceptor;
  }, []);

  if (initialRouteName === null) {
    return null;
  }

  return (
    <NavigationContainer
      linking={{
        prefixes: ['/'],
        config: {
          initialRouteName,
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
            couponList: 'coupons',
            couponCreate: 'coupons/create',
            couponUpdate: {
              path: 'coupons/:couponId',
              parse: {
                couponId: (couponId) => parseInt(couponId),
              },
            },
            ticketList: 'tickets',
            ticketCreate: 'tickets/create',
            ticketUpdate: {
              path: 'tickets/:ticketId',
              parse: {
                ticketId: (ticketId) => parseInt(ticketId),
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
            supplierList: 'suppliers',
            supplierCreate: 'suppliers/create',
            supplierUpdate: {
              path: 'suppliers/:supplierId',
              parse: {
                supplierId: (supplierId) => parseInt(supplierId),
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
            variantList: 'variants',
            variantCreate: 'variants/create',
            variantUpdate: {
              path: 'variants/:variantId',
              parse: {
                variantId: (variantId) => parseInt(variantId),
              },
            },
            budgetList: 'budgets',
            budgetCreate: 'budgets/create',
            budgetUpdate: {
              path: 'budgets/:budgetId',
              parse: {
                budgetId: (budgetId) => parseInt(budgetId),
              },
            },
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
            rentalList: 'rentals',
            rentalCheckin: 'rentals/checkin',
            rentalCheckout: 'rentals/checkout',
            checklistTemplateList: 'checklist-templates',
            checklistTemplateUpdate: {
              path: 'checklist-templates/:checklistTemplateId',
              parse: {
                checklistTemplateId: (checklistTemplateId: string) =>
                  parseInt(checklistTemplateId),
              },
            },
            checklistSessionList: 'checklist-sessions',
            checklistSessionCreate: 'checklist-sessions/create',
            checklistSessionDetail: {
              path: 'checklist-sessions/:checklistSessionId',
              parse: {
                checklistSessionId: (checklistSessionId: string) =>
                  parseInt(checklistSessionId),
              },
            },
          },
        },
      }}
    >
      <RootProvider>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{ header: () => null }}
        >
          <Stack.Screen
            name="authLogin"
            component={AuthLogin}
            options={{ title: 'Login' }}
          />
          <Stack.Screen
            name="dashboard"
            children={() => {
              const defaultTransactionRange = getDateRangeForPreset(
                DEFAULT_TRANSACTION_STATISTIC_PRESET
              );
              const defaultExpenseRange = getDateRangeForPreset(
                DEFAULT_EXPENSE_STATISTIC_PRESET
              );
              return (
                <DashboardApp
                  transactionStatisticListParams={{
                    transactionStatistics: [],
                    preset: DEFAULT_TRANSACTION_STATISTIC_PRESET,
                    groupBy: defaultTransactionRange.groupBy,
                    startDate: defaultTransactionRange.startDate,
                    endDate: defaultTransactionRange.endDate,
                  }}
                  expenseStatisticListParams={{
                    expenseStatistics: [],
                    view: DEFAULT_EXPENSE_STATISTIC_VIEW,
                    preset: DEFAULT_EXPENSE_STATISTIC_PRESET,
                    groupBy: defaultExpenseRange.groupBy,
                    startDate: defaultExpenseRange.startDate,
                    endDate: defaultExpenseRange.endDate,
                  }}
                  expenseRevenueStatisticListParams={{
                    transactionStatistics: [],
                    preset: DEFAULT_EXPENSE_STATISTIC_PRESET,
                    groupBy: defaultExpenseRange.groupBy,
                    startDate: defaultExpenseRange.startDate,
                    endDate: defaultExpenseRange.endDate,
                  }}
                />
              );
            }}
            options={{ title: 'Dashboard' }}
          />
          <Stack.Screen
            name="categoryList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'categoryList'>
            ) => <CategoryList categoryListParams={{ categories: [] }} />}
          />
          <Stack.Screen name="categoryCreate" component={CategoryCreate} />
          <Stack.Screen
            name="categoryUpdate"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'categoryUpdate'
              >
            ) => (
              <CategoryUpdate
                categoryUpdateParams={{
                  category: null,
                  categoryId: props.route.params?.categoryId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="couponList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'couponList'>
            ) => <CouponList couponListParams={{ coupons: [] }} />}
          />
          <Stack.Screen name="couponCreate" component={CouponCreate} />
          <Stack.Screen
            name="couponUpdate"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'couponUpdate'>
            ) => (
              <CouponUpdate
                couponUpdateParams={{
                  coupon: null,
                  couponId: props.route.params?.couponId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="ticketList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'ticketList'>
            ) => <TicketList ticketListParams={{ tickets: [] }} />}
          />
          <Stack.Screen name="ticketCreate" component={TicketCreate} />
          <Stack.Screen
            name="ticketUpdate"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'ticketUpdate'>
            ) => (
              <TicketUpdate
                ticketUpdateParams={{
                  ticket: null,
                  ticketId: props.route.params?.ticketId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="materialList"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'materialList'>
            ) => (
              <MaterialList
                materialListParams={{
                  materials: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen name="materialCreate" component={MaterialCreate} />
          <Stack.Screen
            name="materialUpdate"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'materialUpdate'
              >
            ) => (
              <MaterialUpdate
                materialUpdateParams={{
                  material: null,
                  materialId: props.route.params?.materialId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="supplierList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'supplierList'>
            ) => (
              <SupplierList
                supplierListParams={{
                  suppliers: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen name="supplierCreate" component={SupplierCreate} />
          <Stack.Screen
            name="supplierUpdate"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'supplierUpdate'
              >
            ) => (
              <SupplierUpdate
                supplierUpdateParams={{
                  supplier: null,
                  supplierId: props.route.params?.supplierId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="walletList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'walletList'>
            ) => (
              <WalletList
                walletListParams={{
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen name="walletCreate" component={WalletCreate} />
          <Stack.Screen
            name="walletUpdate"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'walletUpdate'>
            ) => (
              <WalletUpdate
                walletUpdateParams={{
                  wallet: null,
                  walletId: props.route.params?.walletId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="walletTransferList"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'walletTransferList'
              >
            ) => (
              <WalletTransferList
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
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'walletTransferCreate'
              >
            ) => (
              <WalletTransferCreate
                walletTransferCreateParams={{
                  fromWalletId: props.route.params.walletId,
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="productList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'productList'>
            ) => (
              <ProductList
                productListParams={{
                  products: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="productCreate"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'productCreate'
              >
            ) => <ProductCreate productCreateParams={{ categories: [] }} />}
          />
          <Stack.Screen
            name="productUpdate"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'productUpdate'>
            ) => (
              <ProductUpdate
                productUpdateParams={{
                  categories: [],
                  product: null,
                  productId: props.route.params.productId,
                  variants: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="variantList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'variantList'>
            ) => (
              <VariantList
                variantListParams={{
                  variants: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="variantCreate"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'variantCreate'>
            ) => (
              <VariantCreate
                variantCreateParams={{
                  product: null,
                  productId: props.route.params.productId,
                }}
                materialListParam={{
                  materials: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="variantUpdate"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'variantUpdate'>
            ) => (
              <VariantUpdate
                variantUpdateParams={{
                  product: null,
                  variant: null,
                  variantId: props.route.params?.variantId,
                  productId: props.route.params?.productId,
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
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'budgetList'>
            ) => <BudgetList budgetListParams={{ budgets: [] }} />}
          />
          <Stack.Screen name="budgetCreate" component={BudgetCreate} />
          <Stack.Screen
            name="budgetUpdate"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'budgetUpdate'>
            ) => (
              <BudgetUpdate
                budgetUpdateParams={{
                  budget: null,
                  budgetId: props.route.params?.budgetId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="transactionList"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'transactionList'
              >
            ) => (
              <TransactionList
                transactionListParams={{
                  transactions: [],
                  totalItem: 0,
                  wallets: [],
                }}
                transactionPayParams={{ wallets: [] }}
              />
            )}
          />
          <Stack.Screen
            name="transactionCreate"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'transactionCreate'
              >
            ) => (
              <TransactionCreate
                transactionItemSelectParams={{
                  products: [],
                  totalItem: 0,
                }}
                transactionPayParams={{
                  wallets: [],
                }}
                couponListParams={{
                  coupons: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="transactionUpdate"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'transactionUpdate'
              >
            ) => (
              <TransactionUpdate
                transactionItemSelectParams={{
                  products: [],
                  totalItem: 0,
                }}
                transactionUpdateParams={{
                  transaction: null,
                  transactionId: props.route.params.transactionId,
                }}
                couponListParams={{
                  coupons: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="transactionDetail"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'transactionDetail'
              >
            ) => (
              <TransactionDetail
                transactionDetailParams={{
                  transaction: null,
                  transactionId: props.route.params.transactionId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="expenseList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'expenseList'>
            ) => (
              <ExpenseList
                expenseListParams={{
                  expenses: [],
                  budgets: [],
                  totalItem: 0,
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="expenseCreate"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'expenseCreate'
              >
            ) => (
              <ExpenseCreate
                expenseCreateParams={{
                  budgets: [],
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="expenseUpdate"
            children={(
              props: NativeStackScreenProps<RootStackParamList, 'expenseUpdate'>
            ) => (
              <ExpenseUpdate
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
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'calculationList'
              >
            ) => (
              <CalculationList
                calculationListParams={{
                  calculations: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="calculationCreate"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'calculationCreate'
              >
            ) => (
              <CalculationCreate calculationCreateParams={{ wallets: [] }} />
            )}
          />
          <Stack.Screen
            name="calculationUpdate"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'calculationUpdate'
              >
            ) => (
              <CalculationUpdate
                calculationUpdateParams={{
                  calculation: null,
                  calculationId: props.route.params.calculationId,
                  wallets: [],
                }}
              />
            )}
          />
          <Stack.Screen
            name="rentalList"
            children={(
              _props: NativeStackScreenProps<RootStackParamList, 'rentalList'>
            ) => (
              <RentalList rentalListParams={{ rentals: [], totalItem: 0 }} />
            )}
          />
          <Stack.Screen
            name="rentalCheckin"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'rentalCheckin'
              >
            ) => (
              <RentalCheckin
                transactionItemSelectParams={{ products: [], totalItem: 0 }}
              />
            )}
          />
          <Stack.Screen
            name="rentalCheckout"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'rentalCheckout'
              >
            ) => (
              <RentalCheckout
                rentalListParams={{ rentals: [], totalItem: 0 }}
              />
            )}
          />
          <Stack.Screen
            name="checklistTemplateList"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'checklistTemplateList'
              >
            ) => (
              <ChecklistTemplateList
                checklistTemplateListParams={{
                  checklistTemplates: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="checklistTemplateCreate"
            component={ChecklistTemplateCreate}
          />
          <Stack.Screen
            name="checklistTemplateUpdate"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'checklistTemplateUpdate'
              >
            ) => (
              <ChecklistTemplateUpdate
                checklistTemplateUpdateParams={{
                  checklistTemplate: null,
                  checklistTemplateId: props.route.params.checklistTemplateId,
                }}
              />
            )}
          />
          <Stack.Screen
            name="checklistSessionList"
            children={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'checklistSessionList'
              >
            ) => (
              <ChecklistSessionList
                checklistTemplates={[]}
                checklistSessionCreateParams={{}}
                checklistSessionListParams={{
                  checklistSessions: [],
                  totalItem: 0,
                }}
              />
            )}
          />
          <Stack.Screen
            name="checklistSessionDetail"
            children={(
              props: NativeStackScreenProps<
                RootStackParamList,
                'checklistSessionDetail'
              >
            ) => (
              <ChecklistSessionDetail
                checklistSessionDetailParams={{
                  checklistSession: null,
                  checklistSessionId: props.route.params.checklistSessionId,
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
