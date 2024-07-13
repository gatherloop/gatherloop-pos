// eslint-disable-next-line @nx/enforce-module-boundaries
import { useProductFindById } from '../../../../../api-contract/src';

export type UseProductDetailStateProps = {
  productId: number;
};

export const useProductDetailState = ({
  productId,
}: UseProductDetailStateProps) => {
  const { status, data } = useProductFindById(productId);
  return { status, data };
};
