import { EmptyView, ErrorView, LoadingView, Pagination } from '../../../base';
import { Input, YStack } from 'tamagui';
import { useMaterialListState } from './MaterialList.state';
import { MaterialListItem } from '../MaterialListItem';
import { FlatList } from 'react-native';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { Material } from '../../../../../api-contract/src';

export type MaterialListProps = {
  isSearchAutoFocus?: boolean;
  onItemPress?: (material: Material) => void;
};

export const MaterialList = ({
  isSearchAutoFocus,
  onItemPress,
}: MaterialListProps) => {
  const {
    materials,
    refetch,
    status,
    page,
    setPage,
    itemPerPage,
    searchValue,
    setSearhValue,
    totalItem,
    onDeleteMenuPress,
    onEditMenuPress,
  } = useMaterialListState();
  return (
    <YStack gap="$3" flex={1}>
      <YStack>
        <Input
          placeholder="Search Materials by Name"
          onChangeText={setSearhValue}
          value={searchValue}
          autoFocus={isSearchAutoFocus}
        />
      </YStack>
      {status === 'pending' ? (
        <LoadingView title="Fetching Materials..." />
      ) : status === 'success' ? (
        materials.length > 0 ? (
          <>
            <FlatList
              nestedScrollEnabled
              data={materials}
              renderItem={({ item: material }) => (
                <MaterialListItem
                  name={material.name}
                  price={material.price}
                  unit={material.unit}
                  onPress={() => {
                    if (onItemPress) {
                      onItemPress(material);
                    } else {
                      onEditMenuPress(material);
                    }
                  }}
                  onEditMenuPress={() => onEditMenuPress(material)}
                  onDeleteMenuPress={() => onDeleteMenuPress(material)}
                />
              )}
              keyExtractor={(item) => item.id.toString()}
              ItemSeparatorComponent={() => <YStack height="$1" />}
            />
            <Pagination
              currentPage={page}
              onChangePage={setPage}
              totalItem={totalItem}
              itemPerPage={itemPerPage}
            />
          </>
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
