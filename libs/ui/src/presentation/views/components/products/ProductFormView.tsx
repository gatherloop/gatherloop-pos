import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  FormErrorBanner,
  InputText,
  Select,
  MarkdownEditor,
  FieldArray,
  FieldWatch,
  Tabs,
  FormView,
  FormVariant,
  ConfirmationAlert,
} from '../base';
import {
  Button,
  Card,
  Spinner,
  XStack,
  Paragraph,
  YStack,
  SizableText,
} from 'tamagui';
import {
  AvailabilityTracking,
  ProductForm,
  Variant,
  productCreateFormSchema,
  productUpdateFormSchema,
} from '../../../../domain';
import { Resolver } from 'react-hook-form';
import { Plus, X } from '@tamagui/lucide-icons';
import { FlatList } from 'react-native';
import { VariantListItem } from '../variants';

const availabilityTrackingOptions: {
  label: string;
  value: AvailabilityTracking;
  helperText: string;
}[] = [
  {
    label: 'None',
    value: 'none',
    helperText:
      'No count is kept — the product is always sellable until it is switched off. e.g., Iced Coffee Latte.',
  },
  {
    label: 'Shared across variants',
    value: 'product',
    helperText:
      'One count is shared by every variant. e.g., Soft Cookies, where any flavor draws from the same tray.',
  },
  {
    label: 'Per variant',
    value: 'variant',
    helperText:
      'Each variant keeps its own count. e.g., Es Kopi Susu, where Vanilla can sell out while Banana still has plenty.',
  },
];

export const productCreateFormResolver: Resolver<ProductForm> = zodResolver(
  productCreateFormSchema,
  {},
  { raw: true }
);

export const productUpdateFormResolver: Resolver<ProductForm> = zodResolver(
  productUpdateFormSchema,
  {},
  { raw: true }
);

export type ProductFormViewProps = {
  variant: FormVariant;
  defaultValues: ProductForm;
  resolver: Resolver<ProductForm>;
  variants: Variant[];
  onSubmit: (values: ProductForm) => void;
  categorySelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onVariantDeleteMenuPress?: (variant: Variant) => void;
  onVariantEditMenuPress?: (variant: Variant) => void;
  onVariantPress?: (variant: Variant) => void;
  onVariantCreatePress?: () => void;
  serverError?: string;
};

export const ProductFormView = (props: ProductFormViewProps) => {
  const previousAvailabilityTrackingRef = useRef(
    props.defaultValues.availabilityTracking
  );
  const [pendingAvailabilityTracking, setPendingAvailabilityTracking] =
    useState<AvailabilityTracking | null>(null);

  return (
    <FormView
      variant={props.variant}
      defaultValues={props.defaultValues}
      resolver={props.resolver}
      onSubmit={props.onSubmit}
      loadingTitle="Fetching Product..."
      errorTitle="Failed to Fetch Product"
    >
      {(form) => (
        <>
          <FormErrorBanner message={props.serverError} />
          <Card>
            <Card.Header>
              <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
                <Field name="name" label="Name" flex={1}>
                  <InputText />
                </Field>
                <Field name="categoryId" label="Category" flex={1}>
                  <Select items={props.categorySelectOptions} />
                </Field>
                <Field name="saleType" label="Sale Type" flex={1}>
                  <Select
                    items={[
                      { label: 'Purchase', value: 'purchase' },
                      { label: 'Rental', value: 'rental' },
                    ]}
                  />
                </Field>
                <Field name="imageUrl" label="Image URL" flex={1}>
                  <InputText />
                </Field>
              </XStack>

              <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
                <Field name="status" label="Status" flex={1}>
                  <Select
                    items={[
                      { label: 'Draft', value: 'draft' },
                      { label: 'Published', value: 'published' },
                    ]}
                  />
                  <SizableText size="$2" color="$gray10">
                    Draft products are hidden from checkout — use Draft to
                    research a new product before releasing it for sale.
                  </SizableText>
                </Field>
                <Field name="description" label="Description" flex={1}>
                  <InputText />
                  <SizableText size="$2" color="$gray10">
                    One short line shown to customers in the order app.
                  </SizableText>
                </Field>
              </XStack>

              <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
                <Field
                  name="availabilityTracking"
                  label="Availability tracking"
                  flex={1}
                >
                  <Select<AvailabilityTracking>
                    items={availabilityTrackingOptions.map(
                      ({ label, value }) => ({ label, value })
                    )}
                    onValueChange={(value) => {
                      if (value === previousAvailabilityTrackingRef.current) {
                        return;
                      }
                      setPendingAvailabilityTracking(value);
                    }}
                  />
                  <FieldWatch
                    control={form.control}
                    name={['availabilityTracking']}
                  >
                    {([availabilityTracking]) => (
                      <SizableText size="$2" color="$gray10">
                        {
                          availabilityTrackingOptions.find(
                            (option) => option.value === availabilityTracking
                          )?.helperText
                        }{' '}
                        Quantities and switches are set on the Availability
                        screen.
                      </SizableText>
                    )}
                  </FieldWatch>
                </Field>
              </XStack>
            </Card.Header>
          </Card>

          <Tabs
            defaultValue="recipe"
            tabs={[
              {
                label: 'Recipe',
                value: 'recipe',
                content: (
                  <YStack gap="$3">
                    <SizableText size="$2" color="$gray10">
                      Internal preparation steps. Never shown to customers.
                    </SizableText>
                    <MarkdownEditor
                      name="recipe"
                      defaultMode={
                        form.getValues('recipe') === '' ? 'edit' : 'preview'
                      }
                    />
                  </YStack>
                ),
              },
              {
                label: 'Options',
                value: 'options',
                content: (
                  <FieldArray
                    control={form.control}
                    name="options"
                    keyName="key"
                  >
                    {(fieldArray) => (
                      <YStack gap="$3">
                        <XStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Button
                            icon={Plus}
                            onPress={() => {
                              fieldArray.append({
                                name: 'New Option',
                                values: [],
                              });
                            }}
                          >
                            Create Option
                          </Button>
                        </XStack>

                        <XStack gap="$3" flexWrap="wrap">
                          {fieldArray.fields.map((field, index) => (
                            <Card
                              key={field.key}
                              backgroundColor="$background025"
                            >
                              <Card.Header>
                                <YStack gap="$3">
                                  <XStack gap="$3" alignItems="center">
                                    <InputText name={`options.${index}.name`} />
                                    <Button
                                      icon={X}
                                      theme="red"
                                      size="$2"
                                      circular
                                      onPress={() => fieldArray.remove(index)}
                                    />
                                  </XStack>

                                  <FieldArray
                                    control={form.control}
                                    name={`options.${index}.values`}
                                    keyName="key"
                                  >
                                    {(optionValueFieldArray) => (
                                      <YStack gap="$3">
                                        <XStack
                                          gap="$3"
                                          justifyContent="space-between"
                                          alignItems="center"
                                        >
                                          <Paragraph>Values</Paragraph>

                                          <Button
                                            size="$2"
                                            icon={Plus}
                                            onPress={() => {
                                              optionValueFieldArray.append({
                                                name: 'New Value',
                                              });
                                            }}
                                          />
                                        </XStack>

                                        {optionValueFieldArray.fields.map(
                                          (field, indexValue) => (
                                            <XStack
                                              gap="$3"
                                              alignItems="center"
                                              key={field.key}
                                            >
                                              <InputText
                                                name={`options.${index}.values.${indexValue}.name`}
                                              />
                                              <Button
                                                size="$2"
                                                icon={X}
                                                circular
                                                theme="red"
                                                onPress={() =>
                                                  optionValueFieldArray.remove(
                                                    indexValue
                                                  )
                                                }
                                              />
                                            </XStack>
                                          )
                                        )}
                                      </YStack>
                                    )}
                                  </FieldArray>
                                </YStack>
                              </Card.Header>
                            </Card>
                          ))}
                        </XStack>
                      </YStack>
                    )}
                  </FieldArray>
                ),
              },
              {
                label: 'Variants',
                value: 'variants',
                isShown:
                  props.variants.length > 0 ||
                  props.onVariantCreatePress !== undefined,
                content: (
                  <YStack gap="$3">
                    <XStack>
                      <Button icon={Plus} onPress={props.onVariantCreatePress}>
                        Create Variant
                      </Button>
                    </XStack>

                    <FlatList
                      nestedScrollEnabled
                      data={props.variants}
                      contentContainerStyle={{ gap: 16 }}
                      renderItem={({ item }) => (
                        <VariantListItem
                          productName={item.product.name}
                          productSaleType={item.product.saleType}
                          productImageUrl={item.product.imageUrl}
                          optionValues={item.values.map(
                            (variantValue) => variantValue.optionValue
                          )}
                          price={item.price}
                          onDeleteMenuPress={
                            props.onVariantDeleteMenuPress
                              ? () => props.onVariantDeleteMenuPress?.(item)
                              : undefined
                          }
                          onEditMenuPress={
                            props.onVariantEditMenuPress
                              ? () => props.onVariantEditMenuPress?.(item)
                              : undefined
                          }
                          onPress={
                            props.onVariantPress
                              ? () => props.onVariantPress?.(item)
                              : undefined
                          }
                        />
                      )}
                      ItemSeparatorComponent={() => (
                        <YStack height="$1" style={{ flex: 1 }} />
                      )}
                    />
                  </YStack>
                ),
              },
            ]}
          />

          <Button
            disabled={props.isSubmitDisabled}
            onPress={form.handleSubmit(props.onSubmit)}
            theme="blue"
            icon={props.isSubmitting ? <Spinner /> : undefined}
          >
            Submit
          </Button>

          <ConfirmationAlert
            title="Change availability tracking?"
            description="Existing availability counts for this product will be cleared. Quantities and switches are set again on the Availability screen."
            confirmText="Change"
            cancelText="Cancel"
            isOpen={pendingAvailabilityTracking !== null}
            onOpenChange={(isOpen) => {
              if (isOpen) return;
              form.setValue(
                'availabilityTracking',
                previousAvailabilityTrackingRef.current
              );
              setPendingAvailabilityTracking(null);
            }}
            onCancel={() => {
              form.setValue(
                'availabilityTracking',
                previousAvailabilityTrackingRef.current
              );
              setPendingAvailabilityTracking(null);
            }}
            onConfirm={() => {
              if (pendingAvailabilityTracking !== null) {
                previousAvailabilityTrackingRef.current =
                  pendingAvailabilityTracking;
              }
              setPendingAvailabilityTracking(null);
            }}
          />
        </>
      )}
    </FormView>
  );
};
