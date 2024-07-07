import { EmptyView, ErrorView, ListItem, LoadingView } from '../../../base';
import { XStack } from 'tamagui';
import { useMaterialListState } from './MaterialList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material } from '../../../../../api-contract/src';

export type MaterialListProps = {
  itemMenus: { title: string; onPress: (material: Material) => void }[];
  onItemPress: (material: Material) => void;
};

export const MaterialList = ({ itemMenus, onItemPress }: MaterialListProps) => {
  const { materials, refetch, status } = useMaterialListState();
  return (
    <XStack gap="$3" flexWrap="wrap">
      {status === 'pending' ? (
        <LoadingView title="Fetching Materials..." />
      ) : status === 'success' ? (
        materials.length > 0 ? (
          materials.map((material) => (
            <ListItem
              key={material.id}
              title={material.name}
              $xs={{ flexBasis: '100%' }}
              $sm={{ flexBasis: '40%' }}
              flexBasis="30%"
              onPress={() => onItemPress(material)}
              menus={itemMenus.map((itemMenu) => ({
                ...itemMenu,
                onPress: () => itemMenu.onPress(material),
              }))}
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
    </XStack>
  );
};
