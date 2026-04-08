import { Plus, Trash, X } from '@tamagui/lucide-icons';
import { Button, Card, Form, H4, XStack, YStack } from 'tamagui';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { Field, FieldArray, InputText } from '../base';
import { ChecklistTemplateForm } from '../../../domain';

export type ChecklistTemplateFormViewProps = {
  form: UseFormReturn<ChecklistTemplateForm>;
  onSubmit: (values: ChecklistTemplateForm) => void;
  isSubmitDisabled: boolean;
};

export const ChecklistTemplateFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
}: ChecklistTemplateFormViewProps) => {
  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <Card padding="$3" gap="$3">
          <YStack gap="$3" $gtMd={{ flexDirection: 'row' }}>
            <YStack flex={1}>
              <Field name="name" label="Template Name">
                <InputText placeholder="e.g. Opening Checklist" />
              </Field>
            </YStack>
            <YStack flex={1}>
              <Field name="description" label="Description (optional)">
                <InputText placeholder="When/how to use this checklist" />
              </Field>
            </YStack>
          </YStack>
        </Card>

        <FieldArray control={form.control} name="items" keyName="key">
          {(itemsArray) => (
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <H4>Checklist Items</H4>
                <Button
                  size="$3"
                  icon={Plus}
                  variant="outlined"
                  onPress={() =>
                    itemsArray.append({
                      name: '',
                      description: '',
                      displayOrder: itemsArray.fields.length + 1,
                      subItems: [],
                    })
                  }
                >
                  Add Item
                </Button>
              </XStack>

              {itemsArray.fields.map((field, index) => (
                <Card key={field.key} padding="$3" gap="$3">
                  <XStack justifyContent="space-between" alignItems="center">
                    <H4 size="$4">Item {index + 1}</H4>
                    <Button
                      size="$3"
                      icon={Trash}
                      theme="red"
                      color="$red8"
                      circular
                      onPress={() => itemsArray.remove(index)}
                    />
                  </XStack>

                  <YStack gap="$3" $gtMd={{ flexDirection: 'row' }}>
                    <YStack flex={1}>
                      <Field name={`items.${index}.name`} label="Item Name">
                        <InputText placeholder="e.g. Turn on lights" />
                      </Field>
                    </YStack>
                    <YStack flex={1}>
                      <Field
                        name={`items.${index}.description`}
                        label="Description (optional)"
                      >
                        <InputText placeholder="Additional instructions" />
                      </Field>
                    </YStack>
                  </YStack>

                  <FieldArray
                    control={form.control}
                    name={`items.${index}.subItems`}
                    keyName="key"
                  >
                    {(subItemsArray) => (
                      <YStack gap="$2">
                        <XStack
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <H4 size="$3">Sub-Items</H4>
                          <Button
                            size="$2"
                            icon={Plus}
                            variant="outlined"
                            onPress={() =>
                              subItemsArray.append({
                                name: '',
                                displayOrder: subItemsArray.fields.length + 1,
                              })
                            }
                          >
                            Add Sub-Item
                          </Button>
                        </XStack>

                        {subItemsArray.fields.map((subField, subIndex) => (
                          <XStack
                            key={subField.key}
                            gap="$2"
                            alignItems="center"
                          >
                            <YStack flex={1}>
                              <Field
                                name={`items.${index}.subItems.${subIndex}.name`}
                                label={`Sub-Item ${subIndex + 1}`}
                              >
                                <InputText placeholder="e.g. Bar Lamp" />
                              </Field>
                            </YStack>
                            <Button
                              size="$2"
                              icon={X}
                              theme="red"
                              color="$red8"
                              circular
                              onPress={() => subItemsArray.remove(subIndex)}
                            />
                          </XStack>
                        ))}
                      </YStack>
                    )}
                  </FieldArray>
                </Card>
              ))}
            </YStack>
          )}
        </FieldArray>

        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  );
};
