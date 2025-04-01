import { ScrollView } from 'tamagui';
import { CalculationFormView, Layout } from '../components';
import {
  useAuthLogoutController,
  useCalculationCreateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CalculationCreateUsecase } from '../../domain';

export type CalculationCreateScreenProps = {
  calculationCreateUsecase: CalculationCreateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const CalculationCreateScreen = (
  props: CalculationCreateScreenProps
) => {
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const router = useRouter();
  const calculationCreateController = useCalculationCreateController(
    props.calculationCreateUsecase
  );

  useEffect(() => {
    if (calculationCreateController.state.type === 'submitSuccess')
      router.push('/calculations');
  }, [calculationCreateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Create Calculation" showBackButton>
      <ScrollView>
        <CalculationFormView {...calculationCreateController} />
      </ScrollView>
    </Layout>
  );
};
