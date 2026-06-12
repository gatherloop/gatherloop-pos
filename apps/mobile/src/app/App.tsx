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
  WalletTransferList,
  WalletTransferCreate,
  TransactionList,
  TransactionCreate,
  TransactionUpdate,
  TransactionDetail,
  ExpenseList,
  ExpenseCreate,
  ExpenseUpdate,
  TransactionStatisticApp,
  AuthLogin,
  CalculationList,
  CalculationCreate,
  CalculationUpdate,
  CouponList,
  CouponCreate,
  CouponUpdate,
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
  couponList: undefined;
  couponCreate: undefined;
  couponUpdate: { couponId: number };
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
            couponList: 'coupons',
            couponCreate: 'coupons/create',
            couponUpdate: {
              path: 'coupons/:couponId',
              parse: {
                couponId: (couponId) => parseInt(couponId),
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
          initialRouteName="dashboard"
          screenOptions={{ header: () => null }}
        >
          <Stack.Screen
            name="authLogin"
            component={AuthLogin}
            options={{ title: 'Login' }}
          />
          <Stack.Screen
            name="dashboard"
            component={() => (
              <TransactionStatisticApp
                transactionStatisticListParams={{
                  transactionStatistics: [],
                }}
              />
            )}
            options={{ title: 'Dashboard' }}
          />
          <Stack.Screen
            name="categoryList"
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'categoryList'>
            ) => <CategoryList categoryListParams={{ categories: [] }} />}
          />
          <Stack.Screen name="categoryCreate" component={CategoryCreate} />
          <Stack.Screen
            name="categoryUpdate"
            component={(
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
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'couponList'>
            ) => <CouponList couponListParams={{ coupons: [] }} />}
          />
          <Stack.Screen name="couponCreate" component={CouponCreate} />
          <Stack.Screen
            name="couponUpdate"
            component={(
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
            name="materialList"
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
              _props: NativeStackScreenProps<
                RootStackParamList,
                'productCreate'
              >
            ) => <ProductCreate productCreateParams={{ categories: [] }} />}
          />
          <Stack.Screen
            name="productUpdate"
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'budgetList'>
            ) => <BudgetList budgetListParams={{ budgets: [] }} />}
          />
          <Stack.Screen
            name="transactionList"
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
              _props: NativeStackScreenProps<RootStackParamList, 'rentalList'>
            ) => (
              <RentalList rentalListParams={{ rentals: [], totalItem: 0 }} />
            )}
          />
          <Stack.Screen
            name="rentalCheckin"
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
            component={(
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
