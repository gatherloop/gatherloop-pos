import {
  resolveSession,
  SESSION_ID_COOKIE_NAME,
} from '@gatherloop-pos/ui';
import { TableResolve } from '@gatherloop-pos/ui/order';
import { GetServerSideProps } from 'next';

export type IndexPageProps = { sessionId: string };

// D3 in docs/trd-order-app-composition-and-ssr.md: resolves the session and
// nothing else — no seeding yet (P6).
export const getServerSideProps: GetServerSideProps<IndexPageProps> = async (
  ctx
) => {
  const { sessionId, setCookie } = resolveSession(
    ctx.req.cookies[SESSION_ID_COOKIE_NAME]
  );
  if (setCookie) ctx.res.setHeader('Set-Cookie', setCookie);

  return { props: { sessionId } };
};

// A bare `/` (no code) is the "scan the QR at your table" screen (D17 in
// docs/prd-table-ordering.md) — same outcome as 404.tsx.
export default function Index({ sessionId }: IndexPageProps) {
  return <TableResolve code={null} sessionId={sessionId} />;
}
