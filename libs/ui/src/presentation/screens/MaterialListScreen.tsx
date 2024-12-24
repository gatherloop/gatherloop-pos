import { Button } from 'tamagui';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { MaterialDeleteAlert, MaterialList, Layout } from '../components';
import {
  Material,
  MaterialDeleteUsecase,
  MaterialListUsecase,
} from '../../domain';
import {
  useMaterialDeleteController,
  useMaterialListController,
} from '../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

export type MaterialListScreenProps = {
  materialListUsecase: MaterialListUsecase;
  materialDeleteUsecase: MaterialDeleteUsecase;
};

export const MaterialListScreen = (props: MaterialListScreenProps) => {
  const materialListController = useMaterialListController(
    props.materialListUsecase
  );
  const materialDeleteController = useMaterialDeleteController(
    props.materialDeleteUsecase
  );

  const router = useRouter();

  useEffect(() => {
    if (materialDeleteController.state.type === 'deletingSuccess')
      materialListController.dispatch({ type: 'FETCH' });
  }, [materialDeleteController.state.type, materialListController]);

  const onEditMenuPress = (material: Material) => {
    router.push(`/materials/${material.id}`);
  };

  const onItemPress = (material: Material) => {
    router.push(`/materials/${material.id}`);
  };

  const onDeleteMenuPress = (material: Material) => {
    materialDeleteController.dispatch({
      type: 'SHOW_CONFIRMATION',
      materialId: material.id,
    });
  };

  return (
    <Layout
      title="Materials"
      rightActionItem={
        <Link href="/materials/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <MaterialList
        {...materialListController}
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <MaterialDeleteAlert {...materialDeleteController} />
    </Layout>
  );
};
