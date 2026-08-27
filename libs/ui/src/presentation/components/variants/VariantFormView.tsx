import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  InputText,
  InputNumber,
  Select,
  Sheet,
  FieldWatch,
  FormErrorBanner,
  MarkdownEditor,
  Tabs,
  FieldArray,
  ErrorMessage,
  FormView,
  FormVariant,
} from '../base';
import {
  Button,
  Card,
  H3,
  H4,
  Paragraph,
  ScrollView,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { MaterialListItem } from '../materials';
import { Material, Product, VariantForm, variantFormSchema } from '../../../domain';
import { UseFieldArrayReturn } from 'react-hook-form';
import { ReactNode } from 'react';

const variantFormResolver = zodResolver(variantFormSchema, {}, { raw: true });

export type VariantFormViewProps = {
  variant: FormVariant;
  defaultValues: VariantForm;
  onSubmit: (values: VariantForm) => void;
  product: Product | null;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  MaterialList: (
    fieldArray: UseFieldArrayReturn<VariantForm, 'materials', 'key'>,
    onAddMaterial: (material: Material) => void
  ) => ReactNode;
  serverError?: string;
};

export const VariantFormView = (props: VariantFormViewProps) => {
  const [isMaterialSheetOpen, setIsMaterialSheetOpen] = useState(false);
  const isRental = props.product?.saleType === 'rental';

  return (
    <FormView
      variant={props.variant}
      defaultValues={props.defaultValues}
      resolver={variantFormResolver}
      onSubmit={props.onSubmit}
      loadingTitle="Fetching Variant..."
      errorTitle="Failed to Fetch Variant"
    >
      {(form) => {
        const onAddMaterial = (
          newMaterial: Material,
          fieldArray: UseFieldArrayReturn<VariantForm, 'materials', 'key'>
        ) => {
          const itemIndex = fieldArray.fields.findIndex(
            ({ material }) => material.id === newMaterial.id
          );
          const isItemExist = itemIndex !== -1;

          if (isItemExist) {
            fieldArray.update(itemIndex, {
              ...form.getValues('materials')[itemIndex],
              amount: form.getValues('materials')[itemIndex].amount + 1,
            });
          } else {
            fieldArray.append({
              materialId: newMaterial.id,
              amount: 1,
              material: newMaterial,
            });
          }

          setIsMaterialSheetOpen(false);
        };

        const onRemoveMaterial = (
          newMaterial: Material,
          fieldArray: UseFieldArrayReturn<VariantForm, 'materials', 'key'>
        ) => {
          const itemIndex = fieldArray.fields.findIndex(
            ({ material }) => material.id === newMaterial.id
          );
          const isItemExist = itemIndex !== -1;
          if (isItemExist) fieldArray.remove(itemIndex);
        };

        return (
          <>
            <FormErrorBanner message={props.serverError} />
            <Card>
              <Card.Header>
                <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
                  <Field name="name" label="Name" flex={1}>
                    <InputText />
                  </Field>
                  {!isRental && (
                    <Field name="price" label="Price" flex={1}>
                      <InputNumber min={0} />
                    </Field>
                  )}
                  <Field name="description" label="Description" flex={1}>
                    <InputText />
                    <SizableText size="$2" color="$gray10">
                      One short line shown to customers in the order app.
                    </SizableText>
                  </Field>
                </XStack>
              </Card.Header>
            </Card>

            {!isRental && (
              <XStack gap="$3">
                <Card>
                  <Card.Header>
                    <Paragraph>Total Food Cost</Paragraph>
                    <FieldWatch control={form.control} name={['materials']}>
                      {([materials]) => (
                        <H4>
                          Rp.{' '}
                          {materials
                            .reduce(
                              (prev, curr) =>
                                prev + curr.material.price * curr.amount,
                              0
                            )
                            .toLocaleString('id')}
                        </H4>
                      )}
                    </FieldWatch>
                  </Card.Header>
                </Card>
                <Card>
                  <Card.Header>
                    <Paragraph>Food Cost Percentage</Paragraph>

                    <FieldWatch
                      control={form.control}
                      name={['price', 'materials']}
                    >
                      {([price, materials]) => (
                        <H4>
                          {(price > 0
                            ? (materials.reduce(
                                (prev, curr) =>
                                  prev + curr.material.price * curr.amount,
                                0
                              ) /
                                price) *
                              100
                            : 0
                          ).toFixed(1)}
                          %
                        </H4>
                      )}
                    </FieldWatch>
                  </Card.Header>
                </Card>
              </XStack>
            )}

            <Tabs
              tabs={[
                ...(isRental
                  ? [
                      {
                        value: 'pricing_tiers',
                        label: 'Pricing Tiers',
                        content: (
                          <YStack gap="$3">
                            <XStack
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <H3>Pricing Tiers</H3>
                              <Button
                                icon={Plus}
                                variant="outlined"
                                circular
                                size="$3"
                                onPress={() =>
                                  form.setValue('pricingTiers', [
                                    ...form.getValues('pricingTiers'),
                                    { upToMinutes: 0, price: 0 },
                                  ])
                                }
                              />
                            </XStack>
                            <Paragraph size="$2" color="$gray10">
                              A single tier behaves like a flat rate. e.g.,
                              "All Day" = one tier at 840 minutes (the cafe's
                              14-hour operating window).
                            </Paragraph>
                            <ErrorMessage name="pricingTiers" />
                            <FieldArray
                              control={form.control}
                              name="pricingTiers"
                              keyName="key"
                            >
                              {(fieldArray) => (
                                <>
                                  {fieldArray.fields.map(({ key }, index) => (
                                    <XStack
                                      key={key}
                                      gap="$3"
                                      alignItems="flex-end"
                                      $sm={{ flexDirection: 'column' }}
                                    >
                                      <Field
                                        name={`pricingTiers.${index}.upToMinutes`}
                                        label="Up To Minutes"
                                        flex={1}
                                      >
                                        <InputNumber min={1} />
                                      </Field>
                                      <Field
                                        name={`pricingTiers.${index}.price`}
                                        label="Price"
                                        flex={1}
                                      >
                                        <InputNumber min={0} />
                                      </Field>
                                      <Button
                                        icon={Trash}
                                        circular
                                        size="$3"
                                        theme="red"
                                        color="$red8"
                                        marginBottom="$2"
                                        onPress={() => fieldArray.remove(index)}
                                      />
                                    </XStack>
                                  ))}
                                </>
                              )}
                            </FieldArray>
                          </YStack>
                        ),
                      },
                    ]
                  : []),
                {
                  value: 'values',
                  label: 'Values',
                  content: (
                    <YStack gap="$3">
                      <H4>Variant Values</H4>
                      <ErrorMessage name="values" />
                      <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
                        {props.product?.options.map((option, index) => (
                          <Field
                            key={option.id}
                            name={`values.${index}.optionValueId`}
                            label={option.name}
                            flex={1}
                          >
                            <Select
                              items={option.values.map((value) => ({
                                label: value.name,
                                value: value.id,
                              }))}
                            />
                          </Field>
                        ))}
                      </XStack>
                    </YStack>
                  ),
                },
                {
                  value: 'materials',
                  label: 'Materials',
                  content: (
                    <YStack gap="$3">
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
                      <ErrorMessage name="materials" />
                      <FieldArray
                        control={form.control}
                        name="materials"
                        keyName="key"
                      >
                        {(fieldArray) => (
                          <>
                            <Sheet
                              isOpen={isMaterialSheetOpen}
                              onOpenChange={setIsMaterialSheetOpen}
                            >
                              <YStack gap="$3" flex={1} padding="$5">
                                <YStack>
                                  <H4 textAlign="center">Choose Materials</H4>
                                  <Paragraph textAlign="center">
                                    Material will automatically added to
                                    variant
                                  </Paragraph>
                                </YStack>
                                <ScrollView flex={1}>
                                  {props.MaterialList(fieldArray, (material) =>
                                    onAddMaterial(material, fieldArray)
                                  )}
                                </ScrollView>
                              </YStack>
                            </Sheet>
                            {fieldArray.fields.map(({ material, key }, index) => (
                              <XStack
                                gap="$3"
                                key={key}
                                $sm={{ flexDirection: 'column' }}
                              >
                                <MaterialListItem
                                  name={material.name}
                                  price={material.price}
                                  unit={material.unit}
                                  weeklyUsage={material.weeklyUsage}
                                  purchaseUnit={material.purchaseUnit}
                                  minimumStock={material.minimumStock}
                                  normalStock={material.normalStock}
                                  isStockCheckRequired={
                                    material.isStockCheckRequired
                                  }
                                  supplierName={
                                    material.suppliers[0]?.supplier.name
                                  }
                                  flex={1}
                                />
                                <YStack alignItems="flex-end" gap="$3">
                                  <YStack>
                                    <Paragraph>Subtotal</Paragraph>
                                    <FieldWatch
                                      control={form.control}
                                      name={[`materials.${index}.amount`]}
                                    >
                                      {([amount]) => (
                                        <H4>
                                          Rp.{' '}
                                          {(
                                            material.price * amount
                                          ).toLocaleString('id')}
                                        </H4>
                                      )}
                                    </FieldWatch>
                                  </YStack>

                                  <XStack alignItems="center" gap="$3">
                                    <Button
                                      icon={Trash}
                                      circular
                                      size="$2"
                                      theme="red"
                                      color="$red8"
                                      onPress={() =>
                                        onRemoveMaterial(material, fieldArray)
                                      }
                                    />
                                    <InputNumber
                                      name={`materials.${index}.amount`}
                                      maxWidth={100}
                                      fractionDigit={2}
                                    />
                                  </XStack>
                                </YStack>
                              </XStack>
                            ))}
                          </>
                        )}
                      </FieldArray>
                    </YStack>
                  ),
                },
                {
                  value: 'recipe',
                  label: 'Recipe',
                  content: (
                    <YStack gap="$3">
                      <SizableText size="$2" color="$gray10">
                        Internal preparation steps. Never shown to customers.
                      </SizableText>
                      <MarkdownEditor name="recipe" defaultMode="edit" />
                    </YStack>
                  ),
                },
              ]}
              defaultValue={isRental ? 'pricing_tiers' : 'materials'}
            />

            <Button
              disabled={props.isSubmitDisabled}
              onPress={form.handleSubmit(props.onSubmit)}
              theme="blue"
              icon={props.isSubmitting ? <Spinner /> : undefined}
            >
              Submit
            </Button>
          </>
        );
      }}
    </FormView>
  );
};
