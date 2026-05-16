import {
  Field,
  FormErrorBanner,
  InputText,
  InputNumber,
  MarkdownEditor,
} from '../base';
import { MaterialForm, Supplier } from '../../../domain';
import { Controller, FormProvider, UseFormReturn } from 'react-hook-form';
import {
  Button,
  Checkbox,
  Form,
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
              name="supplierIds"
              render={({ field: { value, onChange } }) => (
                <YStack gap="$2">
                  {suppliers.map((supplier) => {
                    const checked = value?.includes(supplier.id) ?? false;
                    return (
                      <XStack
                        key={supplier.id}
                        gap="$3"
                        alignItems="center"
                        onPress={() => {
                          const next = checked
                            ? (value ?? []).filter((id) => id !== supplier.id)
                            : [...(value ?? []), supplier.id];
                          onChange(next);
                        }}
                      >
                        <Checkbox
                          id={`supplier-${supplier.id}`}
                          checked={checked}
                          onCheckedChange={(val) => {
                            const next = val
                              ? [...(value ?? []), supplier.id]
                              : (value ?? []).filter(
                                  (id) => id !== supplier.id
                                );
                            onChange(next);
                          }}
                        >
                          <Checkbox.Indicator>
                            <Check />
                          </Checkbox.Indicator>
                        </Checkbox>
                        <YStack flex={1}>
                          <SizableText>{supplier.name}</SizableText>
                          <SizableText size="$2" color="$gray10">
                            {supplier.isOnline ? 'Online' : 'Offline'} •{' '}
                            {supplier.address}
                          </SizableText>
                        </YStack>
                      </XStack>
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
