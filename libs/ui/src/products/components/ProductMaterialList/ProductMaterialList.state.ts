// eslint-disable-next-line @nx/enforce-module-boundaries
import { useProductMaterialList } from '../../../../../api-contract/src';

export type UseProductMaterialListStateProps = {
  productId: number;
};

export const useProductMaterialListState = ({
  productId,
}: UseProductMaterialListStateProps) => {
  const { data, status, error, refetch } = useProductMaterialList(productId);
  return {
    productMaterials: data?.data ?? [],
    status,
    error,
    refetch,
  };
};
