import {
  EmptyView,
  ErrorView,
  ListItem,
  ListItemMenu,
  LoadingView,
} from '../../../base';
import { YStack } from 'tamagui';
import { useMaterialListState } from './MaterialList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material } from '../../../../../api-contract/src';
import { Box } from '@tamagui/lucide-icons';

export type MaterialListProps = {
  itemMenus: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (material: Material) => void;
    isShown?: (material: Material) => void;
  })[];
  onItemPress: (material: Material) => void;
};

export const MaterialList = ({ itemMenus, onItemPress }: MaterialListProps) => {
  const { materials, refetch, status } = useMaterialListState();
  return (
    <YStack gap="$3">
      {status === 'pending' ? (
        <LoadingView title="Fetching Materials..." />
      ) : status === 'success' ? (
        materials.length > 0 ? (
          materials.map((material) => (
            <ListItem
              key={material.id}
              title={material.name}
              subtitle={`Rp. ${material.price.toLocaleString('id')}`}
              thumbnailSrc="https://placehold.jp/120x120.png"
              onPress={() => onItemPress(material)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(material),
                isShown: () =>
                  itemMenu.isShown ? itemMenu.isShown(material) : true,
              }))}
              footerItems={[{ value: material.unit, icon: Box }]}
            />
          ))
        ) : (
          <EmptyView
            title="Oops, Material is Empty"
            subtitle="Please create a new material"
          />
        )
      ) : (
        <ErrorView
          title="Failed to Fetch Materials"
          subtitle="Please click the retry button to refetch data"
          onRetryButtonPress={refetch}
        />
      )}
    </YStack>
  );
};
