import { ReactNode, createContext, useContext, useState } from 'react';
// Deep imports, not the root barrels (D20): those also re-export every POS
// composition root, which would bloat the customer bundle with the POS (D6).
import { ApiCartRepository } from '../data/api/cart';
import { CartAction, CartState, CartUsecase } from '../domain/usecases/cart';
import { Controller } from '../presentation/controllers/controller';
import { useCartController } from '../presentation/controllers/CartController';

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
  children: ReactNode;
};

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cartUsecase] = useState(
    () => new CartUsecase(new ApiCartRepository())
  );
  const controller = useCartController(cartUsecase);

  return (
    <CartContext.Provider value={controller}>{children}</CartContext.Provider>
  );
};
