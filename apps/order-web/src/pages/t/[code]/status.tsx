import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const reference = String(ctx.query?.ref ?? '');

  return {
    redirect: { destination: `/orders/${reference}`, permanent: false },
  };
};

export default function OrderStatusRedirect() {
  return null;
}
