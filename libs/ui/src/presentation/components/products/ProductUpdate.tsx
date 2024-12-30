import {
  Field,
  InputText,
  InputNumber,
  Select,
  Sheet,
  LoadingView,
  ErrorView,
  FieldWatch,
  MarkdownEditor,
} from '../base';
import {
  Button,
  Card,
  Form,
  H3,
  H4,
  Paragraph,
  ScrollView,
  Separator,
  SizableText,
  Tabs,
  XStack,
  YStack,
} from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { MaterialListItem } from '../materials';
import { Material, ProductForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { ReactNode } from 'react';

export type ProductUpdateProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  form: UseFormReturn<ProductForm>;
  onSubmit: (values: ProductForm) => void;
  categorySelectOptions: { label: string; value: number }[];
  isMaterialSheetOpen: boolean;
  onMaterialSheetOpenChange: (open: boolean) => void;
  onRemoveMaterial: (material: Material) => void;
  isSubmitDisabled: boolean;
  MaterialList: ReactNode;
};

export const ProductUpdate = ({
  variant,
  onRetryButtonPress,
  categorySelectOptions,
  isMaterialSheetOpen,
  isSubmitDisabled,
  onMaterialSheetOpenChange,
  form,
  onRemoveMaterial,
  onSubmit,
  MaterialList,
}: ProductUpdateProps) => {
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
            <ScrollView flex={1}>{MaterialList}</ScrollView>
          </YStack>
        </Sheet>

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

              <FieldWatch control={form.control} name={['price', 'materials']}>
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

        <Tabs
          defaultValue="materials"
          orientation="horizontal"
          flexDirection="column"
          borderRadius="$4"
          borderWidth="$0.25"
          overflow="hidden"
          borderColor="$borderColor"
        >
          <Tabs.List padded gap="$3">
            <Tabs.Tab value="materials" radiused>
              <SizableText fontFamily="$body">Materials</SizableText>
            </Tabs.Tab>
            <Tabs.Tab value="description" radiused>
              <SizableText fontFamily="$body">Description</SizableText>
            </Tabs.Tab>
          </Tabs.List>
          <Separator />
          <Tabs.Content
            backgroundColor="$background"
            key="materials"
            padding="$2"
            flex={1}
            borderColor="$background"
            borderRadius="$2"
            borderTopLeftRadius={0}
            borderTopRightRadius={0}
            borderWidth="$2"
            value="materials"
          >
            <YStack gap="$3">
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
              {form.getValues('materials').map(({ material }, index) => (
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
                      <FieldWatch
                        control={form.control}
                        name={[`materials.${index}.amount`]}
                      >
                        {([amount]) => (
                          <H4>
                            Rp. {(material.price * amount).toLocaleString('id')}
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
                        onPress={() => onRemoveMaterial(material)}
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
            </YStack>
          </Tabs.Content>
          <Tabs.Content
            backgroundColor="$background"
            key="description"
            padding="$2"
            flex={1}
            borderColor="$background"
            borderRadius="$2"
            borderTopLeftRadius={0}
            borderTopRightRadius={0}
            borderWidth="$2"
            value="description"
          >
            <MarkdownEditor
              name="description"
              defaultMode={form.getValues('description') ? 'preview' : 'edit'}
            />
          </Tabs.Content>
        </Tabs>

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
