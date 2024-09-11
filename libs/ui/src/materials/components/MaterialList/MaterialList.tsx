import { EmptyView, ErrorView, ListItemMenu, LoadingView } from '../../../base';
import { Input, YStack } from 'tamagui';
import { useMaterialListState } from './MaterialList.state';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material } from '../../../../../api-contract/src';
import { MaterialCard } from '../MaterialCard';
import { FlatList } from 'react-native';

export type MaterialListProps = {
  itemMenus?: (Omit<ListItemMenu, 'onPress' | 'isShown'> & {
    onPress: (material: Material) => void;
    isShown?: (material: Material) => void;
  })[];
  onItemPress: (material: Material) => void;
  isSearchAutoFocus?: boolean;
};

export const MaterialList = ({
  itemMenus = [],
  onItemPress,
  isSearchAutoFocus,
}: MaterialListProps) => {
  const { materials, refetch, status, searchInputValue, setSearchInputValue } =
    useMaterialListState();
  return (
    <YStack gap="$3">
      <Input
        placeholder="Search Materials by Name"
        value={searchInputValue}
        onChangeText={setSearchInputValue}
        autoFocus={isSearchAutoFocus}
      />
      {status === 'pending' ? (
        <LoadingView title="Fetching Materials..." />
      ) : status === 'success' ? (
        materials.length > 0 ? (
          <FlatList
            nestedScrollEnabled
            data={materials}
            renderItem={({ item: material }) => (
              <MaterialCard
                name={material.name}
                price={material.price}
                unit={material.unit}
                onPress={() => onItemPress(material)}
                menus={itemMenus.map((itemMenu) => ({
                  ...itemMenu,
                  onPress: () => itemMenu.onPress(material),
                  isShown: () =>
                    itemMenu.isShown ? itemMenu.isShown(material) : true,
                }))}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            ItemSeparatorComponent={() => <YStack height="$1" />}
          />
        ) : (
          <EmptyView
            title="Oops, Material is Empty"
            subtitle="The material you are looking for is not found"
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
