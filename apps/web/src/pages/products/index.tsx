import {
  ApiProductRepository,
  getUrlFromCtx,
  ProductListScreen,
  ProductListScreenProps,
  UrlProductListQueryRepository,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  ProductListScreenProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: { destination: '/auth/login', permanent: false },
    };
  }

  const client = new QueryClient();
  const productRepository = new ApiProductRepository(client);
  const productListQueryRepository = new UrlProductListQueryRepository();

  const url = getUrlFromCtx(ctx);
  const page = productListQueryRepository.getPage(url);
  const itemPerPage = productListQueryRepository.getItemPerPage(url);
  const query = productListQueryRepository.getSearchQuery(url);
  const orderBy = productListQueryRepository.getOrderBy(url);
  const sortBy = productListQueryRepository.getSortBy(url);

  const { products, totalItem } = await productRepository.fetchProductList(
    { page, itemPerPage, orderBy, query, sortBy },
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: {
      productListParams: {
        page,
        itemPerPage,
        totalItem,
        orderBy,
        products,
        query,
        sortBy,
      },
    },
  };
};

export default ProductListScreen;
