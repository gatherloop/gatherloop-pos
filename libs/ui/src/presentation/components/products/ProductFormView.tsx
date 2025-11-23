import {
  Field,
  InputText,
  Select,
  LoadingView,
  ErrorView,
  MarkdownEditor,
  FieldArray,
  Tabs,
} from '../base';
import { Button, Card, Form, XStack, Paragraph, YStack } from 'tamagui';
import { ProductForm, Variant } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Plus, X } from '@tamagui/lucide-icons';
import { FlatList } from 'react-native';
import { VariantListItem } from '../variants';

export type ProductFormViewProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  form: UseFormReturn<ProductForm>;
  variants: Variant[];
  onSubmit: (values: ProductForm) => void;
  categorySelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
  onVariantDeleteMenuPress?: (variant: Variant) => void;
  onVariantEditMenuPress?: (variant: Variant) => void;
  onVariantPress?: (variant: Variant) => void;
  onVariantCreatePress?: () => void;
};

export const ProductFormView = ({
  variant,
  variants,
  onRetryButtonPress,
  categorySelectOptions,
  isSubmitDisabled,
  form,
  onSubmit,
  onVariantDeleteMenuPress,
  onVariantEditMenuPress,
  onVariantPress,
  onVariantCreatePress,
}: ProductFormViewProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Card>
          <Card.Header>
            <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
              <Field name="name" label="Name" flex={1}>
                <InputText />
              </Field>
              <Field name="categoryId" label="Category" flex={1}>
                <Select items={categorySelectOptions} />
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
          </Card.Header>
        </Card>

        <Tabs
          defaultValue="options"
          tabs={[
            {
              label: 'Options',
              value: 'options',
              content: (
                <FieldArray control={form.control} name="options" keyName="key">
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
                variants.length > 0 || onVariantCreatePress !== undefined,
              content: (
                <YStack gap="$3">
                  <XStack>
                    <Button icon={Plus} onPress={onVariantCreatePress}>
                      Create Variant
                    </Button>
                  </XStack>

                  <FlatList
                    nestedScrollEnabled
                    data={variants}
                    contentContainerStyle={{ gap: 16 }}
                    renderItem={({ item }) => (
                      <VariantListItem
                        productName={item.product.name}
                        productImageUrl={item.product.imageUrl}
                        optionValues={item.values.map(
                          (variantValue) => variantValue.optionValue
                        )}
                        price={item.price}
                        onDeleteMenuPress={
                          onVariantDeleteMenuPress
                            ? () => onVariantDeleteMenuPress(item)
                            : undefined
                        }
                        onEditMenuPress={
                          onVariantEditMenuPress
                            ? () => onVariantEditMenuPress(item)
                            : undefined
                        }
                        onPress={
                          onVariantPress
                            ? () => onVariantPress(item)
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
            {
              label: 'Description',
              value: 'description',
              content: <MarkdownEditor name="description" defaultMode="edit" />,
            },
          ]}
        />

        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
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
