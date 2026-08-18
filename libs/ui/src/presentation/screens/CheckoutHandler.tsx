import { useNavigation } from '../navigation';
import { CheckoutScreen } from './CheckoutScreen';

export type CheckoutHandlerProps = {
  enabled: boolean;
  tableCode: string;
};

// FR-8 in docs/prd-table-ordering.md. No usecase and no domain/data layer
// back this slice — the stub makes no API call and creates nothing, so
// there is no state to manage beyond the build-time flag passed down from
// `app/Checkout.tsx`.
export const CheckoutHandler = ({ enabled, tableCode }: CheckoutHandlerProps) => {
  const navigation = useNavigation();

  return (
    <CheckoutScreen
      enabled={enabled}
      onBackToCartPress={() => navigation.push(`/t/${tableCode}/cart`)}
    />
  );
};
