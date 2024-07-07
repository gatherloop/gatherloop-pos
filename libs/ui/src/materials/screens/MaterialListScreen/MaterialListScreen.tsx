import { Button, H3, Paragraph, ScrollView, XStack, YStack } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
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
    <Layout>
      <XStack justifyContent="space-between" alignItems="center">
        <YStack>
          <H3>Materials</H3>
          <Paragraph>Manage your product material</Paragraph>
        </YStack>
        <Link href="/materials/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      </XStack>
      <ScrollView>
        <MaterialList
          onItemPress={onItemPress}
          itemMenus={[
            { title: 'Edit', onPress: onEditMenuPress },
            { title: 'Delete', onPress: onDeleteMenuPress },
          ]}
        />
      </ScrollView>
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
