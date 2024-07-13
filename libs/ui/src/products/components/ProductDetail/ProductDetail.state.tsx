import { useProductFindById } from '@gatherloop-pos/api-contract';

export type UseProductDetailStateProps = {
  productId: number;
};

export const useProductDetailState = ({
  productId,
}: UseProductDetailStateProps) => {
  const { status, data } = useProductFindById(productId);
  return { status, data };
};
