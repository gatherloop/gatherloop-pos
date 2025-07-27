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
  Tabs,
} from '../base';
import {
  Button,
  Card,
  Form,
  H3,
  H4,
  Paragraph,
  ScrollView,
  XStack,
  YStack,
} from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { MaterialListItem } from '../materials';
import { Material, VariantForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';

export type VariantCreateProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  form: UseFormReturn<VariantForm>;
  onSubmit: (values: VariantForm) => void;
  productSelectOptions: { label: string; value: number }[];
  isMaterialSheetOpen: boolean;
  onMaterialSheetOpenChange: (open: boolean) => void;
  onRemoveMaterial: (material: Material) => void;
  isSubmitDisabled: boolean;
  MaterialList: React.ReactNode;
};

export const VariantCreate = ({
  variant,
  onRetryButtonPress,
  form,
  onSubmit,
  productSelectOptions,
  isMaterialSheetOpen,
  isSubmitDisabled,
  onMaterialSheetOpenChange,
  onRemoveMaterial,
  MaterialList,
}: VariantCreateProps) => {
  return variant.type === 'loaded' ? (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Card>
          <Card.Header>
            <XStack gap="$3" $sm={{ flexDirection: 'column' }}>
              <Field name="name" label="Name" flex={1}>
                <InputText />
              </Field>
              <Field name="productId" label="Product" flex={1}>
                <Select items={productSelectOptions} />
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
                Material will automatically added to variant
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
          tabs={[
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
                                Rp.{' '}
                                {(material.price * amount).toLocaleString('id')}
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
              ),
            },
            {
              value: 'description',
              label: 'Description',
              content: <MarkdownEditor name="description" defaultMode="edit" />,
            },
          ]}
          defaultValue="materials"
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
    <LoadingView title="Fetching Variant..." />
  ) : variant.type === 'error' ? (
    <ErrorView
      title="Failed to Fetch Variant"
      subtitle="Please click the retry button to refetch data"
      onRetryButtonPress={onRetryButtonPress}
    />
  ) : null;
};
