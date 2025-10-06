import { ScrollView } from 'tamagui';
import { CalculationFormView, Layout } from '../components';
import {
  useAuthLogoutController,
  useCalculationUpdateController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';
import { AuthLogoutUsecase, CalculationUpdateUsecase } from '../../domain';

export type CalculationUpdateScreenProps = {
  calculationUpdateUsecase: CalculationUpdateUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const CalculationUpdateScreen = (
  props: CalculationUpdateScreenProps
) => {
  const router = useRouter();
  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);
  const calculationUpdateController = useCalculationUpdateController(
    props.calculationUpdateUsecase
  );

  useEffect(() => {
    if (calculationUpdateController.state.type === 'submitSuccess')
      router.push('/calculations');
  }, [calculationUpdateController.state.type, router]);

  return (
    <Layout {...authLogoutController} title="Update Calculation" showBackButton>
      <ScrollView>
        <CalculationFormView {...calculationUpdateController} />
      </ScrollView>
    </Layout>
  );
};
