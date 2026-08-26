// Entry point for apps/order (the customer ordering app), per D20 in
// docs/prd-table-ordering.md and D6 in docs/trd-order-app-nextjs-migration.md.
// The root barrel (./index.ts) re-exports ./app, which pulls in every POS
// composition root. Next bundles per page, so importing the root barrel from
// the order app would drag the whole POS into the customer's first load —
// this barrel stays POS-free so it doesn't.
//
// Customer-specific slices (Menu*, Cart*) land here as their phases ship;
// today it only carries what's already POS-free and shared with the web app.
export * from './config';
export * from './presentation/components/base/ConfirmationAlert';
export * from './presentation/components/base/LoadingView';
export * from './presentation/components/base/OrderLayout';
export * from './presentation/components/menu/MenuItemThumbnail';
export * from './utils/currency';
export * from './app/SessionProvider';
export * from './app/TableResolve';
export * from './app/MenuList';
export * from './app/MenuItemDetail';
export * from './app/CartProvider';
export * from './app/Cart';
export * from './app/CartItemEdit';
export * from './app/Checkout';
