import { ScrollView } from 'tamagui';
import {
  VariantFormView,
  Layout,
  VariantFormViewProps,
  MaterialList,
  MaterialListProps,
} from '../components';
import { Product, Material, VariantForm } from '../../domain';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';

export type VariantCreateScreenProps = {
  form: UseFormReturn<VariantForm>;
  onSubmit: (values: VariantForm) => void;
  isSubmitDisabled: boolean;
  onLogoutPress: () => void;
  onRetryButtonPress: () => void;
  isMaterialSheetOpen: boolean;
  onMaterialSheetOpenChange: (open: boolean) => void;
  onAddMaterial: (
    newMaterial: Material,
    fieldArray: UseFieldArrayReturn<VariantForm, 'materials', 'key'>
  ) => void;
  onRemoveMaterial: (
    newMaterial: Material,
    fieldArray: UseFieldArrayReturn<VariantForm, 'materials', 'key'>
  ) => void;
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
};

export const VariantCreateScreen = (props: VariantCreateScreenProps) => {
  return (
    <Layout
      title={`Create ${props.product?.name} Variant`}
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <VariantFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isMaterialSheetOpen={props.isMaterialSheetOpen}
          onMaterialSheetOpenChange={props.onMaterialSheetOpenChange}
          onRetryButtonPress={props.onRetryButtonPress}
          onRemoveMaterial={props.onRemoveMaterial}
          product={props.product}
          variant={props.variant}
          MaterialList={(fieldArray) => (
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
              onItemPress={(material) =>
                props.onAddMaterial(material, fieldArray)
              }
            />
          )}
        />
      </ScrollView>
    </Layout>
  );
};
