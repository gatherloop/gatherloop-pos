// Entry point for apps/order (the customer ordering SPA), per D20 in
// docs/prd-table-ordering.md. The root barrel (./index.ts) re-exports ./app,
// which pulls in every POS composition root and, transitively, solito and
// next — packages a Vite build has no business resolving. This barrel stays
// solito/next-free so the order app never has to reach past it into the
// root barrel.
//
// Customer-specific slices (Menu*, Cart*) land here as their phases ship;
// today it only carries what's already Next-free and shared with the POS.
export * from './config';
export * from './presentation/components/base/ConfirmationAlert';
export * from './presentation/components/base/OrderLayout';
export * from './presentation/components/menu/MenuItemThumbnail';
export * from './presentation/navigation';
export * from './utils/currency';
export * from './app/SessionProvider';
export * from './app/TableResolve';
export * from './app/MenuList';
export * from './app/MenuItemDetail';
export * from './app/CartProvider';
export * from './app/Cart';
