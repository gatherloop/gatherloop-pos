import { FieldArray, FormikProvider } from 'formik';
import {
  Field,
  Form,
  InputText,
  InputNumber,
  Select,
  Sheet,
  SubmitButton,
} from '../../../base';
import {
  UseProductFormStateProps,
  useProductFormState,
} from './ProductForm.state';
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
import { MaterialCard, MaterialList } from '../../../materials/components';

export type ProductFormProps = {
  variant: UseProductFormStateProps['variant'];
  onSuccess: () => void;
};

export const ProductForm = ({ variant, onSuccess }: ProductFormProps) => {
  const {
    formik,
    categories,
    isMaterialSheetOpen,
    setIsMaterialSheetOpen,
    onAddMaterial,
    foodCostPercentage,
    totalFoodCost,
  } = useProductFormState({ variant, onSuccess });
  return (
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
                  items={categories.map((category) => ({
                    label: category.name,
                    value: String(category.id),
                  }))}
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
          onOpenChange={setIsMaterialSheetOpen}
        >
          <YStack gap="$3" flex={1} padding="$5">
            <YStack>
              <H4 textAlign="center">Choose Materials</H4>
              <Paragraph textAlign="center">
                Material will automatically added to product
              </Paragraph>
            </YStack>
            <ScrollView flex={1}>
              <MaterialList onItemPress={onAddMaterial} />
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
            onPress={() => setIsMaterialSheetOpen(true)}
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
                  <MaterialCard
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
                        maxWidth={50}
                        fractionDigit={2}
                      />
                    </XStack>
                  </YStack>
                </XStack>
              ))}
              <SubmitButton>Submit</SubmitButton>
            </YStack>
          )}
        </FieldArray>
      </Form>
    </FormikProvider>
  );
};
