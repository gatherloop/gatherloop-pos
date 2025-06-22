import {
  ApiCalculationRepository,
  CalculationListScreen,
  CalculationListScreenProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  CalculationListScreenProps
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

  const client = new QueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  const calculations = await calculationRepository.fetchCalculationList({
    headers: { Cookie: ctx.req.headers.cookie },
  });
  return {
    props: { calculationListParams: { calculations } },
  };
};

export default CalculationListScreen;
