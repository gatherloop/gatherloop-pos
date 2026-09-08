import { ReactNode, createContext, useContext, useState } from 'react';
// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiCartRepository } from '../../data/api/cart';
import { CookieSessionRepository } from '../../data/session/CookieSessionRepository';
import { UrlCartQueryRepository } from '../../data/url/cartQuery';
import { CartAction, CartState, CartUsecase } from '../../domain/usecases/cart';
import { Controller } from '../../presentation/controllers/controller';
import { useCartController } from '../../presentation/controllers/CartController';

const CartContext = createContext<Controller<CartState, CartAction> | null>(
  null
);

// FR-7 in docs/prd-table-ordering.md. One `CartUsecase` for the whole
// app — mounted once, above the router — because the floating bar, the cart
// screen (phase 10) and the item detail sheet's Add-to-cart CTA (phase 8)
// all read and mutate the same cart.
export const useCart = (): Controller<CartState, CartAction> => {
  const controller = useContext(CartContext);
  if (!controller) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return controller;
};

export type CartProviderProps = {
  // D3 in docs/trd-order-app-composition-and-ssr.md: resolved server-side by
  // each page's getServerSideProps and threaded down through _app.tsx's
  // pageProps — temporary scaffolding, gone once P5 lets `Cart` construct
  // its own `CartUsecase` directly instead of reading this app-wide one.
  sessionId?: string;
  children: ReactNode;
};

export const CartProvider = ({ sessionId, children }: CartProviderProps) => {
  const [cartUsecase] = useState(
    () =>
      new CartUsecase(
        new ApiCartRepository(new CookieSessionRepository(sessionId)),
        new UrlCartQueryRepository()
      )
  );
  const controller = useCartController(cartUsecase);

  return (
    <CartContext.Provider value={controller}>{children}</CartContext.Provider>
  );
};
