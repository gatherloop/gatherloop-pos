import {
  Field,
  FormErrorBanner,
  InputText,
  InputNumber,
  MarkdownEditor,
} from '../base';
import { MaterialForm, MaterialSupplierInput, PurchaseType, Supplier } from '../../../domain';
import { Controller, FormProvider, UseFormReturn } from 'react-hook-form';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Separator,
  SizableText,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { Check } from '@tamagui/lucide-icons';

export type MaterialFormViewProps = {
  form: UseFormReturn<MaterialForm>;
  onSubmit: (values: MaterialForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  serverError?: string;
  suppliers?: Supplier[];
};

const PURCHASE_TYPE_OPTIONS: { label: string; value: PurchaseType }[] = [
  { label: 'Offline', value: 'offline' },
  { label: 'Online', value: 'online' },
  { label: 'Delivery', value: 'delivery' },
];

export const MaterialFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  serverError,
  suppliers = [],
}: MaterialFormViewProps) => {
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
            How many recipe units are in 1 purchase unit (e.g. 1000 if
            unit=Gram and purchase unit=Kg)
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

        {suppliers.length > 0 && (
          <>
            <Separator />
            <SizableText size="$4" fontWeight="bold">
              Suppliers
            </SizableText>
            <Controller
              control={form.control}
              name="materialSuppliers"
              render={({ field: { value, onChange } }) => (
                <YStack gap="$3">
                  {suppliers.map((supplier) => {
                    const existing = value?.find(
                      (ms) => ms.supplierId === supplier.id
                    );
                    const isChecked = !!existing;

                    const toggle = () => {
                      if (isChecked) {
                        onChange(
                          (value ?? []).filter(
                            (ms) => ms.supplierId !== supplier.id
                          )
                        );
                      } else {
                        onChange([
                          ...(value ?? []),
                          {
                            supplierId: supplier.id,
                            purchaseType: 'offline' as PurchaseType,
                            purchaseUrl: '',
                          } satisfies MaterialSupplierInput,
                        ]);
                      }
                    };

                    const setPurchaseType = (pt: PurchaseType) => {
                      onChange(
                        (value ?? []).map((ms) =>
                          ms.supplierId === supplier.id
                            ? { ...ms, purchaseType: pt, purchaseUrl: pt === 'online' ? ms.purchaseUrl : '' }
                            : ms
                        )
                      );
                    };

                    const setPurchaseUrl = (url: string) => {
                      onChange(
                        (value ?? []).map((ms) =>
                          ms.supplierId === supplier.id
                            ? { ...ms, purchaseUrl: url }
                            : ms
                        )
                      );
                    };

                    return (
                      <YStack
                        key={supplier.id}
                        borderWidth={1}
                        borderColor={isChecked ? '$blue8' : '$borderColor'}
                        borderRadius="$3"
                        padding="$3"
                        gap="$2"
                      >
                        <XStack gap="$3" alignItems="center" onPress={toggle}>
                          <Checkbox
                            id={`supplier-${supplier.id}`}
                            checked={isChecked}
                            onCheckedChange={toggle}
                          >
                            <Checkbox.Indicator>
                              <Check />
                            </Checkbox.Indicator>
                          </Checkbox>
                          <YStack flex={1}>
                            <SizableText fontWeight="bold">{supplier.name}</SizableText>
                            <SizableText size="$2" color="$gray10">
                              {supplier.address}
                            </SizableText>
                          </YStack>
                        </XStack>

                        {isChecked && (
                          <YStack gap="$2" paddingLeft="$6">
                            <SizableText size="$2" color="$gray10">
                              How will you purchase from this supplier?
                            </SizableText>
                            <XStack gap="$2" flexWrap="wrap">
                              {PURCHASE_TYPE_OPTIONS.map((opt) => (
                                <Button
                                  key={opt.value}
                                  size="$2"
                                  theme={
                                    existing?.purchaseType === opt.value
                                      ? 'blue'
                                      : undefined
                                  }
                                  variant={
                                    existing?.purchaseType === opt.value
                                      ? undefined
                                      : 'outlined'
                                  }
                                  onPress={() => setPurchaseType(opt.value)}
                                >
                                  {opt.label}
                                </Button>
                              ))}
                            </XStack>
                            {existing?.purchaseType === 'online' && (
                              <Input
                                placeholder="Purchase URL (e.g. Tokopedia link)"
                                value={existing.purchaseUrl}
                                onChangeText={setPurchaseUrl}
                                autoCorrect={false}
                              />
                            )}
                          </YStack>
                        )}
                      </YStack>
                    );
                  })}
                </YStack>
              )}
            />
          </>
        )}

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
