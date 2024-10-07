import { ProductListItem } from '../ProductListItem';
import { useProductDetailState } from './ProductDetail.state';

export type ProductDetailProps = {
  productId: number;
};

export const ProductDetail = ({ productId }: ProductDetailProps) => {
  const { data } = useProductDetailState({ productId });
  return (
    <ProductListItem
      categoryName={data?.data.category?.name ?? ''}
      name={data?.data.name ?? ''}
      price={data?.data.price ?? 0}
    />
  );
};
