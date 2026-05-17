import { useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  Button,
  Card,
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
import { MaterialForm, PurchaseType, Supplier } from '../../../domain';
import { FieldArray, ErrorMessage, Field, InputText, Select } from '../base';

type MaterialSuppliersFormProps = {
  availableSuppliers: Supplier[];
  isLoadingSuppliers?: boolean;
};

const PURCHASE_TYPES: { label: string; value: PurchaseType }[] = [
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Delivery', value: 'delivery' },
];

export const MaterialSuppliersForm = ({
  availableSuppliers,
  isLoadingSuppliers,
}: MaterialSuppliersFormProps) => {
  const form = useFormContext<MaterialForm>();

  const supplierSelectItems = [
    { label: 'Select a supplier...', value: 0 },
    ...availableSuppliers.map((s) => ({ label: s.name, value: s.id })),
  ];

  return (
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
                              form.setValue(
                                `suppliers.${index}.purchaseUrl`,
                                ''
                              );
                              form.clearErrors(`suppliers.${index}.supplierId`);
                            }}
                          >
                            <XStack gap="$4" flexWrap="wrap">
                              {PURCHASE_TYPES.map((pt) => (
                                <XStack
                                  key={pt.value}
                                  alignItems="center"
                                  gap="$2"
                                >
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

                    <PurchaseTypeFields
                      index={index}
                      availableSuppliers={availableSuppliers}
                    />
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
  );
};

type PurchaseTypeFieldsProps = {
  index: number;
  availableSuppliers: Supplier[];
};

const PurchaseTypeFields = ({
  index,
  availableSuppliers,
}: PurchaseTypeFieldsProps) => {
  const form = useFormContext<MaterialForm>();
  const supplierId = form.watch(`suppliers.${index}.supplierId`);
  const purchaseType = form.watch(`suppliers.${index}.purchaseType`);
  const selectedSupplier = availableSuppliers.find((s) => s.id === supplierId);

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
      <YStack
        gap="$2"
        backgroundColor="$gray2"
        borderRadius="$3"
        padding="$3"
      >
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
      <YStack
        gap="$2"
        backgroundColor="$gray2"
        borderRadius="$3"
        padding="$3"
      >
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
