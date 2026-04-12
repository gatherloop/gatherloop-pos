import { ScrollView } from 'tamagui';
import {
  VariantFormView,
  Layout,
  VariantFormViewProps,
  MaterialListProps,
  MaterialList,
} from '../components';
import { Product, VariantForm } from '../../domain';
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';
import { Material } from '../../domain';

export type VariantUpdateScreenProps = {
  form: UseFormReturn<VariantForm>;
  onSubmit: (values: VariantForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onLogoutPress: () => void;
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
  onRetryButtonPress: () => void;
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

export const VariantUpdateScreen = (props: VariantUpdateScreenProps) => {
  return (
    <Layout
      title="Update Variant"
      showBackButton
      onLogoutPress={props.onLogoutPress}
    >
      <ScrollView>
        <VariantFormView
          form={props.form}
          onSubmit={props.onSubmit}
          isSubmitDisabled={props.isSubmitDisabled}
          isSubmitting={props.isSubmitting}
          isMaterialSheetOpen={props.isMaterialSheetOpen}
          onMaterialSheetOpenChange={props.onMaterialSheetOpenChange}
          onRemoveMaterial={props.onRemoveMaterial}
          variant={props.variant}
          onRetryButtonPress={props.onRetryButtonPress}
          product={props.product}
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
