import { ProductCard } from '../ProductCard';
import { useProductDetailState } from './ProductDetail.state';

export type ProductDetailProps = {
  productId: number;
};

export const ProductDetail = ({ productId }: ProductDetailProps) => {
  const { data } = useProductDetailState({ productId });
  return (
    <ProductCard
      categoryName={data?.data.category?.name ?? ''}
      name={data?.data.name ?? ''}
      price={data?.data.price ?? 0}
    />
  );
};
