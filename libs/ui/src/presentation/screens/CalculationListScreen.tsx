import { Button } from 'tamagui';
import {
  CalculationList,
  CalculationDeleteAlert,
  Layout,
  CalculationCompleteAlert,
} from '../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import {
  useAuthLogoutController,
  useCalculationCompleteController,
  useCalculationDeleteController,
  useCalculationListController,
} from '../controllers';
import {
  AuthLogoutUsecase,
  Calculation,
  CalculationCompleteUsecase,
  CalculationDeleteUsecase,
  CalculationListUsecase,
} from '../../domain';
import { useRouter } from 'solito/router';
import { useEffect } from 'react';

export type CalculationListScreenProps = {
  calculationListUsecase: CalculationListUsecase;
  calculationDeleteUsecase: CalculationDeleteUsecase;
  calculationCompleteUsecase: CalculationCompleteUsecase;
  authLogoutUsecase: AuthLogoutUsecase;
};

export const CalculationListScreen = (props: CalculationListScreenProps) => {
  const router = useRouter();

  const authLogoutController = useAuthLogoutController(props.authLogoutUsecase);

  const calculationListController = useCalculationListController(
    props.calculationListUsecase
  );
  const calculationDeleteController = useCalculationDeleteController(
    props.calculationDeleteUsecase
  );
  const calculationCompleteController = useCalculationCompleteController(
    props.calculationCompleteUsecase
  );

  useEffect(() => {
    if (
      calculationDeleteController.state.type === 'deletingSuccess' ||
      calculationCompleteController.state.type === 'completingSuccess'
    ) {
      calculationListController.dispatch({ type: 'FETCH' });
    }
  }, [
    calculationDeleteController.state.type,
    calculationCompleteController.state.type,
    calculationListController,
  ]);

  const onDeleteMenuPress = (calculation: Calculation) => {
    calculationDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      calculationId: calculation.id,
    });
  };

  const onEditMenuPress = (calculation: Calculation) => {
    router.push(`/calculations/${calculation.id}`);
  };

  const onCompleteMenuPress = (calculation: Calculation) => {
    calculationCompleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      calculationId: calculation.id,
    });
  };

  const onItemPress = (calculation: Calculation) => {
    router.push(`/calculations/${calculation.id}`);
  };

  return (
    <Layout
      {...authLogoutController}
      title="Calculations"
      rightActionItem={
        <Link href="/calculations/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <CalculationList
        {...calculationListController}
        onDeleteMenuPress={onDeleteMenuPress}
        onEditMenuPress={onEditMenuPress}
        onCompleteMenuPress={onCompleteMenuPress}
        onItemPress={onItemPress}
      />
      <CalculationDeleteAlert {...calculationDeleteController} />
      <CalculationCompleteAlert {...calculationCompleteController} />
    </Layout>
  );
};
