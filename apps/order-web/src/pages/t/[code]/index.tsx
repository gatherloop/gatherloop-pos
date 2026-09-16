import {
  ApiMenuRepository,
  ApiPaymentRepository,
  ApiPublicTableRepository,
  CookieSessionRepository,
  getUrlFromCtx,
  ORDER_HISTORY_LIMIT,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
  TableNotFoundError,
  toSerializableProps,
  UrlMenuListQueryRepository,
} from '@gatherloop-pos/ui';
import { MenuList, MenuListProps } from '@gatherloop-pos/ui/order';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<MenuListProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const code = String(ctx.params?.code ?? '');
  const url = getUrlFromCtx(ctx);
  const client = new QueryClient();
  const sessionRepository = new CookieSessionRepository(sessionId);

  const [table, menu, payments] = await Promise.all([
    new ApiPublicTableRepository()
      .resolveTableByCode(code)
      .catch((error) =>
        error instanceof TableNotFoundError ? null : undefined
      ),
    new ApiMenuRepository(client)
      .fetchMenu({ query: '' })
      .catch(() => ({ products: [], categories: [], variants: [] })),
    new ApiPaymentRepository(sessionRepository)
      .fetchPayments({ limit: ORDER_HISTORY_LIMIT, skip: 0 })
      .then(({ payments }) => payments)
      .catch(() => []),
  ]);

  return {
    props: toSerializableProps({
      sessionId,
      code,
      table,
      products: menu.products,
      categories: menu.categories,
      variants: menu.variants,
      selectedProductId:
        new UrlMenuListQueryRepository().getSelectedProductId(url),
      preparingCount: payments.filter(
        (payment) => payment.fulfillmentStatus === 'preparing'
      ).length,
    }),
  };
};

export default MenuList;
