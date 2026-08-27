import { ScrollView } from 'tamagui';
import {
  VariantFormView,
  Layout,
  VariantFormViewProps,
  MaterialListProps,
  MaterialList,
} from '../components';
import { Product, VariantForm } from '../../domain';

export type VariantUpdateScreenProps = {
  defaultValues: VariantForm;
  onSubmit: (values: VariantForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
  variant: VariantFormViewProps['variant'];
  product: Product | null;
  materialList: {
    currentPage: number;
    itemPerPage: number;
    onPageChange: (page: number) => void;
    onRetryButtonPress: () => void;
    onSearchValueChange: (value: string) => void;
    searchValue: string;
    totalItem: number;
    variant: MaterialListProps['variant'];
  };
  serverError?: string;
};

export const VariantUpdateScreen = (props: VariantUpdateScreenProps) => {
  return (
    <Layout
      title="Update Variant"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <VariantFormView
          defaultValues={props.defaultValues}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          variant={props.variant}
          product={props.product}
          serverError={props.serverError}
          MaterialList={(fieldArray, onAddMaterial) => (
            <MaterialList
              isSearchAutoFocus
              currentPage={props.materialList.currentPage}
              itemPerPage={props.materialList.itemPerPage}
              onPageChange={props.materialList.onPageChange}
              onRetryButtonPress={props.materialList.onRetryButtonPress}
              onSearchValueChange={props.materialList.onSearchValueChange}
              searchValue={props.materialList.searchValue}
              totalItem={props.materialList.totalItem}
              variant={props.materialList.variant}
              onItemPress={onAddMaterial}
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
