import { createParam } from 'solito';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  calculationFindById,
  calculationFindByIdQueryKey,
  walletList,
  walletListQueryKey,
} from '../../../api-contract/src';
import {
  ApiAuthRepository,
  ApiCalculationRepository,
  ApiWalletRepository,
} from '../data';
import { AuthLogoutUsecase, CalculationUpdateUsecase } from '../domain';
import { CalculationUpdateScreen as CalculationUpdateScreenView } from '../presentation';
import {
  dehydrate,
  DehydratedState,
  QueryClient,
  useQueryClient,
} from '@tanstack/react-query';
import { GetServerSidePropsContext } from 'next';

export async function getCalculationUpdateScreenDehydratedState(
  ctx: GetServerSidePropsContext,
  calculationId: number
): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: calculationFindByIdQueryKey(calculationId),
      queryFn: () =>
        calculationFindById(calculationId, {
          headers: { Cookie: ctx.req.headers.cookie },
        }),
    }),
    queryClient.prefetchQuery({
      queryKey: walletListQueryKey(),
      queryFn: () =>
        walletList({ headers: { Cookie: ctx.req.headers.cookie } }),
    }),
  ]);

  return dehydrate(queryClient);
}

export type CalculationUpdateScreenProps = {
  calculationId: number;
};

const { useParam } = createParam<CalculationUpdateScreenProps>();

export function CalculationUpdateScreen({
  calculationId,
}: CalculationUpdateScreenProps) {
  const [calculationIdParam] = useParam('calculationId', {
    initial: calculationId ?? NaN,
    parse: (value) => parseInt(Array.isArray(value) ? value[0] : value ?? ''),
  });
  const client = useQueryClient();
  const calculationRepository = new ApiCalculationRepository(client);
  calculationRepository.calculationByIdServerParams = calculationIdParam;
  const walletRepository = new ApiWalletRepository(client);
  const calculationUpdateUsecase = new CalculationUpdateUsecase(
    calculationRepository,
    walletRepository
  );

  const authRepository = new ApiAuthRepository();
  const authLogoutUsecase = new AuthLogoutUsecase(authRepository);

  return (
    <CalculationUpdateScreenView
      calculationUpdateUsecase={calculationUpdateUsecase}
      authLogoutUsecase={authLogoutUsecase}
    />
  );
}
