import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { MaterialDeleteAlert, MaterialList } from '../../widgets';
import { Material } from '../../../../../domain';
import {
  useMaterialDeleteController,
  useMaterialListController,
} from '../../../../controllers';
import { useEffect } from 'react';
import { useRouter } from 'solito/router';

const Content = () => {
  const materialListController = useMaterialListController();
  const materialDeleteController = useMaterialDeleteController();

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
    <>
      <MaterialList
        onEditMenuPress={onEditMenuPress}
        onDeleteMenuPress={onDeleteMenuPress}
        onItemPress={onItemPress}
      />
      <MaterialDeleteAlert />
    </>
  );
};

export const MaterialListScreen = () => {
  return (
    <Layout
      title="Materials"
      rightActionItem={
        <Link href="/materials/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <Content />
    </Layout>
  );
};
