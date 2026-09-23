import {
  ApiCustomerRepository,
  ApiPaymentRepository,
  ApiPublicTableRepository,
  CookieSessionRepository,
  formatWhatsappNumberForInput,
  ORDER_HISTORY_LIMIT,
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
  const sessionRepository = new CookieSessionRepository(sessionId);

  const [table, customer, payments] = await Promise.all([
    new ApiPublicTableRepository()
      .resolveTableByCode(code)
      .catch((error) =>
        error instanceof TableNotFoundError ? null : undefined
      ),
    new ApiCustomerRepository(sessionRepository)
      .fetchCurrentCustomer()
      .catch(() => ({ name: '', whatsappNumber: '' })),
    new ApiPaymentRepository(sessionRepository)
      .fetchPayments({ limit: ORDER_HISTORY_LIMIT, skip: 0 })
      .then(({ payments }) => payments)
      .catch(() => []),
  ]);

  return {
    props: {
      sessionId,
      code,
      table,
      customerName: customer.name,
      customerWhatsappNumber: customer.whatsappNumber
        ? formatWhatsappNumberForInput(customer.whatsappNumber)
        : '',
      preparingCount: payments.filter(
        (payment) => payment.fulfillmentStatus === 'preparing'
      ).length,
    },
  };
};

export default Cart;
