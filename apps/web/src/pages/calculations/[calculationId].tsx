import {
  ApiCalculationRepository,
  ApiWalletRepository,
  CalculationUpdateScreen,
  CalculationUpdateScreenProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  CalculationUpdateScreenProps,
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
    props: { calculationListParams: { calculation, calculationId, wallets } },
  };
};

export default CalculationUpdateScreen;
