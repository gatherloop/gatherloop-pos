import { Button, ScrollView } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialList } from '../../components';
import { Link } from 'solito/link';
import { Pencil, Plus, Trash } from '@tamagui/lucide-icons';
import { MaterialDeleteAlert } from '../../components/MaterialDeleteAlert';
import { useMaterialListScreenState } from './MaterialListScreen.state';

export const MaterialListScreen = () => {
  const {
    onItemPress,
    onEditMenuPress,
    onDeleteMenuPress,
    onDeleteSuccess,
    onDeleteCancel,
    materialDeleteId,
  } = useMaterialListScreenState();

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
        onItemPress={onItemPress}
        itemMenus={[
          { title: 'Edit', icon: Pencil, onPress: onEditMenuPress },
          { title: 'Delete', icon: Trash, onPress: onDeleteMenuPress },
        ]}
      />
      {typeof materialDeleteId === 'number' && (
        <MaterialDeleteAlert
          materialId={materialDeleteId}
          onSuccess={onDeleteSuccess}
          onCancel={onDeleteCancel}
        />
      )}
    </Layout>
  );
};
