import {
  Field,
  InputText,
  Select,
  LoadingView,
  ErrorView,
  MarkdownEditor,
  FieldArray,
} from '../base';
import { Button, Card, Form, XStack, Paragraph, YStack, H4 } from 'tamagui';
import { ProductForm } from '../../../domain';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Plus, X } from '@tamagui/lucide-icons';

export type ProductFormViewProps = {
  variant: { type: 'loaded' } | { type: 'loading' } | { type: 'error' };
  onRetryButtonPress: () => void;
  form: UseFormReturn<ProductForm>;
  onSubmit: (values: ProductForm) => void;
  categorySelectOptions: { label: string; value: number }[];
  isSubmitDisabled: boolean;
};

export const ProductFormView = ({
  variant,
  onRetryButtonPress,
  categorySelectOptions,
  isSubmitDisabled,
  form,
  onSubmit,
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
            </XStack>
          </Card.Header>
        </Card>
        <Card>
          <Card.Header>
            <FieldArray control={form.control} name="options" keyName="key">
              {(fieldArray) => (
                <YStack gap="$3">
                  <XStack justifyContent="space-between" alignItems="center">
                    <H4>Options</H4>
                    <Button
                      icon={Plus}
                      onPress={() => {
                        fieldArray.append({ name: 'New Option', values: [] });
                      }}
                    />
                  </XStack>

                  <XStack gap="$3" flexWrap="wrap">
                    {fieldArray.fields.map((field, index) => (
                      <Card key={field.key} backgroundColor="$background025">
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
          </Card.Header>
        </Card>
        <MarkdownEditor name="description" defaultMode="edit" />
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
