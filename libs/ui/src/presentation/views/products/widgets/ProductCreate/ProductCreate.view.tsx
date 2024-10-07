import { FieldArray, FormikContextType, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  Select,
  Sheet,
  SubmitButton,
  LoadingView,
  ErrorView,
} from '../../../base';
import {
  Button,
  Card,
  H3,
  H4,
  Paragraph,
  ScrollView,
  XStack,
  YStack,
} from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { MaterialListItem, MaterialList } from '../../../materials';
import { Material, ProductForm } from '../../../../../domain';

export type ProductCreateViewProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  formik: FormikContextType<ProductForm>;
  categorySelectOptions: { label: string; value: string }[];
  isMaterialSheetOpen: boolean;
  onMaterialSheetOpenChange: (open: boolean) => void;
  onAddMaterial: (material: Material) => void;
  isSubmitDisabled: boolean;
  totalFoodCost: number;
  foodCostPercentage: number;
};

export const ProductCreateView = ({
  variant,
  onRetryButtonPress,
  formik,
  categorySelectOptions,
  isMaterialSheetOpen,
  isSubmitDisabled,
  onMaterialSheetOpenChange,
  onAddMaterial,
  totalFoodCost,
  foodCostPercentage,
}: ProductCreateViewProps) => {
  return variant.type === 'loaded' ? (
    <FormikProvider value={formik}>
      <Form>
        <Card>
          <Card.Header>
            <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
              <Field name="name" label="Name" flex={1}>
                <InputText />
              </Field>
              <Field name="categoryId" label="Category" flex={1}>
                <Select
                  items={categorySelectOptions}
                  parseInputToFieldValue={parseInt}
                  parseFieldToInputValue={String}
                />
              </Field>
              <Field name="price" label="Price" flex={1}>
                <InputNumber min={0} />
              </Field>
            </XStack>
          </Card.Header>
        </Card>

        <Sheet
          isOpen={isMaterialSheetOpen}
          onOpenChange={onMaterialSheetOpenChange}
        >
          <YStack gap="$3" flex={1} padding="$5">
            <YStack>
              <H4 textAlign="center">Choose Materials</H4>
              <Paragraph textAlign="center">
                Material will automatically added to product
              </Paragraph>
            </YStack>
            <ScrollView flex={1}>
              <MaterialList onItemPress={onAddMaterial} isSearchAutoFocus />
            </ScrollView>
          </YStack>
        </Sheet>

        <XStack gap="$3">
          <Card>
            <Card.Header>
              <Paragraph>Total Food Cost</Paragraph>
              <H4>Rp. {totalFoodCost.toLocaleString('id')}</H4>
            </Card.Header>
          </Card>
          <Card>
            <Card.Header>
              <Paragraph>Food Cost Percentage</Paragraph>
              <H4>{foodCostPercentage.toFixed(1)}%</H4>
            </Card.Header>
          </Card>
        </XStack>

        <XStack justifyContent="space-between">
          <H3>Materials</H3>
          <Button
            icon={Plus}
            variant="outlined"
            circular
            size="$3"
            onPress={() => onMaterialSheetOpenChange(true)}
          />
        </XStack>

        <FieldArray name="materials">
          {({ remove }) => (
            <YStack gap="$3">
              {formik.values.materials.map(({ material, amount }, index) => (
                <XStack
                  gap="$3"
                  key={material.id}
                  $sm={{ flexDirection: 'column' }}
                >
                  <MaterialListItem
                    name={material.name}
                    price={material.price}
                    unit={material.unit}
                    flex={1}
                  />
                  <YStack alignItems="flex-end" gap="$3">
                    <YStack>
                      <Paragraph>Subtotal</Paragraph>
                      <H4>
                        Rp. {(material.price * amount).toLocaleString('id')}
                      </H4>
                    </YStack>

                    <XStack alignItems="center" gap="$3">
                      <Button
                        icon={Trash}
                        circular
                        size="$2"
                        theme="red"
                        color="$red8"
                        onPress={() => remove(index)}
                      />
                      <InputNumber
                        name={`materials[${index}].amount`}
                        maxWidth={100}
                        fractionDigit={2}
                      />
                    </XStack>
                  </YStack>
                </XStack>
              ))}
              <SubmitButton disabled={isSubmitDisabled}>Submit</SubmitButton>
            </YStack>
          )}
        </FieldArray>
      </Form>
    </FormikProvider>
  ) : variant.type === 'loading' ? (
    <LoadingView title="Fetching Product..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Product"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
