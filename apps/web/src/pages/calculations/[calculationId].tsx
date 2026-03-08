import {
  ApiCalculationRepository,
  ApiWalletRepository,
  CalculationUpdate,
  CalculationUpdateProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  CalculationUpdateProps,
  { calculationId: string }
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const calculationId = parseInt(ctx.params?.calculationId ?? '');
  const client = new QueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const walletRepository = new ApiWalletRepository(client);

  const wallets = await walletRepository.fetchWalletList({
    headers: { Cookie: ctx.req.headers.cookie },
  });
  const calculation = await calculationRepository.fetchCalculationById(
    calculationId,
    { headers: { Cookie: ctx.req.headers.cookie } }
  );

  return {
    props: { calculationUpdateParams: { calculation, calculationId, wallets } },
  };
};

export default CalculationUpdate;
