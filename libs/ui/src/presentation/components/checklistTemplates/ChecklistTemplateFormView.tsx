import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowUp, Plus, Trash, X } from '@tamagui/lucide-icons';
import { Button, Card, H4, SizableText, Spinner, XStack, YStack } from 'tamagui';
import {
  Field,
  FieldArray,
  FormErrorBanner,
  FormVariant,
  FormView,
  InputText,
  MarkdownEditor,
} from '../base';
import { ChecklistTemplateForm, checklistTemplateFormSchema } from '../../../domain';

const checklistTemplateFormResolver = zodResolver(checklistTemplateFormSchema);

export type ChecklistTemplateFormViewProps = {
  variant: FormVariant;
  defaultValues: ChecklistTemplateForm;
  onSubmit: (values: ChecklistTemplateForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
};

export const ChecklistTemplateFormView = (
  props: ChecklistTemplateFormViewProps
) => (
  <FormView
    variant={props.variant}
    defaultValues={props.defaultValues}
    resolver={checklistTemplateFormResolver}
    onSubmit={props.onSubmit}
    loadingTitle="Fetching Checklist Template..."
    errorTitle="Failed to Fetch Checklist Template"
  >
    {(form) => (
      <>
        <FormErrorBanner message={props.serverError} />
        <Card padding="$3" gap="$3">
          <Field name="name" label="Template Name">
            <InputText placeholder="e.g. Opening Checklist" />
          </Field>
          <Field name="description" label="Description (optional)">
            <SizableText size="$2" color="$gray10">
              Explain when/how to use this checklist. Markdown is supported
              (lists, bold, headings), so you can add detail without creating
              more checklist items.
            </SizableText>
            <MarkdownEditor
              name="description"
              defaultMode={form.getValues('description') ? 'preview' : 'edit'}
            />
          </Field>
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
                    <XStack gap="$2" alignItems="center">
                      <Button
                        size="$3"
                        icon={ArrowUp}
                        circular
                        disabled={index === 0}
                        opacity={index === 0 ? 0.4 : 1}
                        onPress={() => itemsArray.move(index, index - 1)}
                      />
                      <Button
                        size="$3"
                        icon={ArrowDown}
                        circular
                        disabled={index === itemsArray.fields.length - 1}
                        opacity={
                          index === itemsArray.fields.length - 1 ? 0.4 : 1
                        }
                        onPress={() => itemsArray.move(index, index + 1)}
                      />
                      <Button
                        size="$3"
                        icon={Trash}
                        theme="red"
                        color="$red8"
                        circular
                        onPress={() => itemsArray.remove(index)}
                      />
                    </XStack>
                  </XStack>

                  <Field name={`items.${index}.name`} label="Item Name">
                    <InputText placeholder="e.g. Turn on lights" />
                  </Field>

                  <Field
                    name={`items.${index}.description`}
                    label="Description (optional)"
                  >
                    <SizableText size="$2" color="$gray10">
                      Use Markdown to clarify this item (e.g. list which
                      lamps to turn on, or the steps to follow). Only add
                      sub-items below when each step must be checked off
                      individually.
                    </SizableText>
                    <MarkdownEditor
                      name={`items.${index}.description`}
                      defaultMode={
                        form.getValues(`items.${index}.description`)
                          ? 'preview'
                          : 'edit'
                      }
                    />
                  </Field>

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
                              icon={ArrowUp}
                              circular
                              disabled={subIndex === 0}
                              opacity={subIndex === 0 ? 0.4 : 1}
                              onPress={() =>
                                subItemsArray.move(subIndex, subIndex - 1)
                              }
                            />
                            <Button
                              size="$2"
                              icon={ArrowDown}
                              circular
                              disabled={
                                subIndex === subItemsArray.fields.length - 1
                              }
                              opacity={
                                subIndex === subItemsArray.fields.length - 1
                                  ? 0.4
                                  : 1
                              }
                              onPress={() =>
                                subItemsArray.move(subIndex, subIndex + 1)
                              }
                            />
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
          disabled={props.isSubmitDisabled}
          onPress={form.handleSubmit(props.onSubmit)}
          theme="blue"
          icon={props.isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </>
    )}
  </FormView>
);
