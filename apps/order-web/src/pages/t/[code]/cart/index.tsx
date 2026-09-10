import {
  ApiPublicTableRepository,
  resolveSession,
  SESSION_ID_COOKIE_NAME,
  TableNotFoundError,
} from '@gatherloop-pos/ui';
import { Cart, CartProps } from '@gatherloop-pos/ui/order';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<CartProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  const code = String(ctx.params?.code ?? '');
  const table = await new ApiPublicTableRepository()
    .resolveTableByCode(code)
    .catch((error) =>
      error instanceof TableNotFoundError ? null : undefined
    );

  return {
    props: { sessionId, code, table },
  };
};

export default Cart;
