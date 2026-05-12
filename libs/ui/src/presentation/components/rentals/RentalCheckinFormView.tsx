import { Field, FieldWatch, FormErrorBanner, InputText, Select } from '../base';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Label,
  Paragraph,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { H4 } from 'tamagui';
import { Check, Trash } from '@tamagui/lucide-icons';
import { PricingTier, RentalCheckinForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode, useRef } from 'react';
import { Separator } from 'tamagui';

function formatPricingBadge(tiers: PricingTier[]): string | null {
  if (tiers.length === 0) return null;
  const fmtPrice = (price: number) => {
    const k = price / 1000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
  };
  if (tiers.length === 1)
    return `Flat: Rp. ${tiers[0].price.toLocaleString('id')} (≤${tiers[0].upToMinutes}min)`;
  const fmtTier = (t: PricingTier) => `${t.upToMinutes}min: ${fmtPrice(t.price)}`;
  if (tiers.length <= 3) return tiers.map(fmtTier).join(' | ');
  const first = tiers.slice(0, 2).map(fmtTier).join(' | ');
  return `${first} | … | cap: ${fmtPrice(tiers[tiers.length - 1].price)}`;
}

export type RentalCheckinFormViewProps = {
  form: UseFormReturn<RentalCheckinForm>;
  onToggleCustomizeCheckinDateTime: (checked: boolean) => void;
  onSubmit: (form: RentalCheckinForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  RentalItemSelect: () => ReactNode;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckinForm, 'rentals', 'key'>;
  serverError?: string;
};

export const RentalCheckinFormView = ({
  form,
  onToggleCustomizeCheckinDateTime,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  RentalItemSelect,
  rentalsFieldArray,
  serverError,
}: RentalCheckinFormViewProps) => {
  const inputCodeRefs = useRef<(Input | null)[]>([]);
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <FormErrorBanner message={serverError} />
          <YStack>
            <YStack gap="$3">
              <XStack gap="$3">
                <YStack flex={1}>{RentalItemSelect()}</YStack>

                <Card padded width={350} flex={1}>
                  <YStack gap="$3">
                    <Field
                      name="name"
                      label="Customer Name"
                      maxWidth={300}
                      flex={1}
                    >
                      <InputText />
                    </Field>
                    <FieldWatch control={form.control} name={['checkinAt']}>
                      {([checkinAt]) => (
                        <YStack>
                          <XStack>
                            <XStack width={300} alignItems="center" gap="$4">
                              <Checkbox
                                id="customizeCheckinAt"
                                checked={checkinAt !== null}
                                onCheckedChange={
                                  onToggleCustomizeCheckinDateTime
                                }
                              >
                                <Checkbox.Indicator>
                                  <Check />
                                </Checkbox.Indicator>
                              </Checkbox>

                              <Label htmlFor="customizeCheckinAt">
                                Customize Checkin Date Time
                              </Label>
                            </XStack>
                          </XStack>
                          {checkinAt !== null && (
                            <YStack>
                              <XStack gap="$3">
                                <Field
                                  name="checkinAt.date"
                                  label="Date"
                                  flex={1}
                                >
                                  <Select
                                    items={Array.from(
                                      { length: 31 },
                                      (_, i) => ({
                                        label: (i + 1)
                                          .toString()
                                          .padStart(2, '0'),
                                        value: i + 1,
                                      })
                                    )}
                                  />
                                </Field>
                                <Field
                                  name="checkinAt.month"
                                  label="Month"
                                  minWidth={150}
                                  flex={1}
                                >
                                  <Select
                                    items={[
                                      { label: 'Januari', value: 0 },
                                      { label: 'Februari', value: 1 },
                                      { label: 'Maret', value: 2 },
                                      { label: 'April', value: 3 },
                                      { label: 'Mei', value: 4 },
                                      { label: 'Juni', value: 5 },
                                      { label: 'July', value: 6 },
                                      { label: 'Agustus', value: 7 },
                                      { label: 'September', value: 8 },
                                      { label: 'Oktober', value: 9 },
                                      { label: 'November', value: 10 },
                                      { label: 'Desember', value: 11 },
                                    ]}
                                  />
                                </Field>
                                <Field
                                  name="checkinAt.year"
                                  label="Year"
                                  flex={1}
                                >
                                  <Select
                                    items={Array.from(
                                      {
                                        length:
                                          new Date().getFullYear() + 1 - 2000,
                                      },
                                      (_, i) => ({
                                        label: (i + 2000).toString(),
                                        value: i + 2000,
                                      })
                                    )}
                                  />
                                </Field>
                              </XStack>
                              <XStack gap="$3">
                                <Field
                                  name="checkinAt.hour"
                                  label="Hour"
                                  flex={1}
                                >
                                  <Select
                                    items={Array.from(
                                      { length: 24 },
                                      (_, i) => ({
                                        label: i.toString().padStart(2, '0'),
                                        value: i,
                                      })
                                    )}
                                  />
                                </Field>
                                <Field
                                  name="checkinAt.minute"
                                  label="Minute"
                                  flex={1}
                                >
                                  <Select
                                    items={Array.from(
                                      { length: 60 },
                                      (_, i) => ({
                                        label: i.toString().padStart(2, '0'),
                                        value: i,
                                      })
                                    )}
                                  />
                                </Field>
                              </XStack>
                            </YStack>
                          )}
                        </YStack>
                      )}
                    </FieldWatch>

                    <H4>Items</H4>
                    {rentalsFieldArray.fields.map(({ variant, key }, index) => {
                      const pricingBadge = formatPricingBadge(variant.pricingTiers);
                      return (
                        <YStack key={key} gap="$3">
                          <XStack
                            gap="$3"
                            flex={1}
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <XStack gap="$3">
                              <Button
                                icon={Trash}
                                size="$3"
                                onPress={() => rentalsFieldArray.remove(index)}
                                theme="red"
                                color="$red8"
                                circular
                              />
                              <YStack>
                                <Paragraph size="$5">
                                  {variant.product.name}
                                </Paragraph>
                                <Paragraph>
                                  {variant.values
                                    .map(({ optionValue }) => optionValue.name)
                                    .join(' - ')}
                                </Paragraph>
                                {pricingBadge !== null && (
                                  <Paragraph size="$2" color="$gray10">
                                    {pricingBadge}
                                  </Paragraph>
                                )}
                              </YStack>
                            </XStack>
                          </XStack>
                          <InputText
                            name={`rentals.${index}.code`}
                            placeholder="Code"
                            flex={1}
                            ref={(element) => {
                              inputCodeRefs.current[index] = element;
                            }}
                            onSubmitEditing={() => {
                              if (index < rentalsFieldArray.fields.length - 1) {
                                inputCodeRefs.current[index + 1]?.focus();
                              }
                            }}
                          />
                          <Separator />
                        </YStack>
                      );
                    })}
                  </YStack>
                </Card>
              </XStack>
            </YStack>
          </YStack>
          <XStack justifyContent="flex-end" gap="$3">
            <Button
              disabled={isSubmitDisabled}
              onPress={form.handleSubmit(onSubmit)}
              size="$5"
              theme="blue"
              icon={isSubmitting ? <Spinner /> : undefined}
            >
              Submit
            </Button>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
