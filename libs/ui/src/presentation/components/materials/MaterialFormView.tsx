import { useEffect } from 'react';
import { Controller, FormProvider, UseFormReturn, useFormContext } from 'react-hook-form';
import {
  Button,
  Card,
  Form,
  H4,
  Label,
  Paragraph,
  RadioGroup,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { Field, FormErrorBanner, InputText, InputNumber, MarkdownEditor, FieldArray, ErrorMessage, Select } from '../base';
import { MaterialForm, PurchaseType, Supplier } from '../../../domain';

export type MaterialFormViewProps = {
  form: UseFormReturn<MaterialForm>;
  onSubmit: (values: MaterialForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
  suppliers: Supplier[];
  isLoadingSuppliers?: boolean;
};

const PURCHASE_TYPES: { label: string; value: PurchaseType }[] = [
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Delivery', value: 'delivery' },
];

type PurchaseTypeFieldsProps = {
  index: number;
  suppliers: Supplier[];
};

const PurchaseTypeFields = ({ index, suppliers }: PurchaseTypeFieldsProps) => {
  const form = useFormContext<MaterialForm>();
  const supplierId = form.watch(`suppliers.${index}.supplierId`);
  const purchaseType = form.watch(`suppliers.${index}.purchaseType`);
  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const hasNoPhone =
    purchaseType === 'delivery' &&
    selectedSupplier !== undefined &&
    !selectedSupplier.phone;

  useEffect(() => {
    if (hasNoPhone) {
      form.setError(`suppliers.${index}.supplierId`, {
        type: 'custom',
        message:
          'This supplier has no phone number. Please add a phone number to the supplier before using delivery.',
      });
    } else {
      const currentError = form.formState.errors.suppliers?.[index]?.supplierId;
      if (currentError?.type === 'custom') {
        form.clearErrors(`suppliers.${index}.supplierId`);
      }
    }
  }, [hasNoPhone, form, index]);

  if (purchaseType === 'online') {
    return (
      <Field name={`suppliers.${index}.purchaseUrl`} label="Purchase URL">
        <InputText placeholder="https://shop.example.com/product" />
      </Field>
    );
  }

  if (purchaseType === 'offline' && selectedSupplier) {
    return (
      <YStack gap="$2" backgroundColor="$gray2" borderRadius="$3" padding="$3">
        <SizableText size="$3" color="$gray10">
          Address
        </SizableText>
        <SizableText>{selectedSupplier.address || '—'}</SizableText>
        {selectedSupplier.mapsLink ? (
          <>
            <SizableText size="$3" color="$gray10">
              Maps Link
            </SizableText>
            <SizableText color="$blue10" numberOfLines={1}>
              {selectedSupplier.mapsLink}
            </SizableText>
          </>
        ) : null}
      </YStack>
    );
  }

  if (purchaseType === 'delivery' && selectedSupplier) {
    return (
      <YStack gap="$2" backgroundColor="$gray2" borderRadius="$3" padding="$3">
        <SizableText size="$3" color="$gray10">
          Phone
        </SizableText>
        {selectedSupplier.phone ? (
          <SizableText>{selectedSupplier.phone}</SizableText>
        ) : (
          <SizableText color="$red10">
            This supplier has no phone number. Please add one before using
            delivery.
          </SizableText>
        )}
      </YStack>
    );
  }

  return null;
};

export const MaterialFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
  suppliers,
  isLoadingSuppliers,
}: MaterialFormViewProps) => {
  const supplierSelectItems = [
    { label: 'Select a supplier...', value: 0 },
    ...suppliers.map((s) => ({ label: s.name, value: s.id })),
  ];

  return (
    <FormProvider {...form}>
      <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
        <FormErrorBanner message={serverError} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Field name="price" label="Price">
          <InputNumber fractionDigit={2} />
        </Field>
        <Field name="unit" label="Unit">
          <InputText />
        </Field>
        <Field name="purchaseUnit" label="Purchase Unit">
          <InputText placeholder="e.g. Kg, Box, Bottle" />
        </Field>
        <Field name="purchaseUnitSize" label="Purchase Unit Size">
          <SizableText size="$2" color="$gray10">
            How many recipe units are in 1 purchase unit (e.g. 1000 if unit=Gram and purchase unit=Kg)
          </SizableText>
          <InputNumber fractionDigit={2} />
        </Field>
        <Field name="minimumStock" label="Minimum Stock (purchase units)">
          <InputNumber fractionDigit={0} />
        </Field>
        <Field name="normalStock" label="Normal Stock (purchase units)">
          <InputNumber fractionDigit={0} />
        </Field>
        <Field name="description" label="Description">
          <MarkdownEditor
            defaultMode={form.getValues('description') ? 'preview' : 'edit'}
          />
        </Field>

        <YStack gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H4>Suppliers</H4>
            <Button
              icon={Plus}
              variant="outlined"
              circular
              size="$3"
              disabled={isLoadingSuppliers}
              onPress={() =>
                form.setValue('suppliers', [
                  ...form.getValues('suppliers'),
                  { supplierId: 0, purchaseType: 'offline', purchaseUrl: '' },
                ])
              }
            />
          </XStack>

          {isLoadingSuppliers && <Spinner />}

          <ErrorMessage name="suppliers" />

          <FieldArray control={form.control} name="suppliers" keyName="key">
            {(fieldArray) => (
              <>
                {fieldArray.fields.map(({ key }, index) => (
                  <Card key={key} bordered>
                    <Card.Header>
                      <YStack gap="$3">
                        <XStack justifyContent="space-between" alignItems="center">
                          <SizableText size="$4" fontWeight="600">
                            Supplier {index + 1}
                          </SizableText>
                          <Button
                            icon={Trash}
                            circular
                            size="$3"
                            theme="red"
                            onPress={() => fieldArray.remove(index)}
                          />
                        </XStack>

                        <Field name={`suppliers.${index}.supplierId`} label="Supplier">
                          <Select items={supplierSelectItems} />
                        </Field>

                        <YStack gap="$2">
                          <Label>Purchase Type</Label>
                          <Controller
                            control={form.control}
                            name={`suppliers.${index}.purchaseType`}
                            render={({ field }) => (
                              <RadioGroup
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value as PurchaseType);
                                  form.setValue(`suppliers.${index}.purchaseUrl`, '');
                                  form.clearErrors(`suppliers.${index}.supplierId`);
                                }}
                              >
                                <XStack gap="$4" flexWrap="wrap">
                                  {PURCHASE_TYPES.map((pt) => (
                                    <XStack key={pt.value} alignItems="center" gap="$2">
                                      <RadioGroup.Item
                                        value={pt.value}
                                        id={`${key}-${pt.value}`}
                                      >
                                        <RadioGroup.Indicator />
                                      </RadioGroup.Item>
                                      <Label htmlFor={`${key}-${pt.value}`}>
                                        {pt.label}
                                      </Label>
                                    </XStack>
                                  ))}
                                </XStack>
                              </RadioGroup>
                            )}
                          />
                          <ErrorMessage name={`suppliers.${index}.purchaseType`} />
                        </YStack>

                        <PurchaseTypeFields index={index} suppliers={suppliers} />
                      </YStack>
                    </Card.Header>
                  </Card>
                ))}

                {fieldArray.fields.length === 0 && (
                  <Paragraph color="$gray10" textAlign="center">
                    No suppliers linked. Click + to add one.
                  </Paragraph>
                )}
              </>
            )}
          </FieldArray>
        </YStack>

        <Button
          disabled={isSubmitDisabled}
          onPress={form.handleSubmit(onSubmit)}
          theme="blue"
          icon={isSubmitting ? <Spinner /> : undefined}
        >
          Submit
        </Button>
      </Form>
    </FormProvider>
  );
};
