import { Button, Card, Form, H4, Spinner, XStack, YStack } from 'tamagui';
import { FormErrorBanner } from '../base';
import { RentalCheckoutForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { RentalCheckoutCartView } from './RentalCheckoutCartView';

export type RentalCheckoutFormViewProps = {
  form: UseFormReturn<RentalCheckoutForm>;
  onSubmit: (form: RentalCheckoutForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  RentalItemSelect: () => ReactNode;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckoutForm, 'rentals', 'key'>;
  serverError?: string;
};

export const RentalCheckoutFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  RentalItemSelect,
  rentalsFieldArray,
  serverError,
}: RentalCheckoutFormViewProps) => {
  const now = new Date();

  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <FormErrorBanner message={serverError} />
          <XStack gap="$5">
            <YStack flex={1}>{RentalItemSelect()}</YStack>
            <YStack gap="$3" width={400} flex={1}>
              <Card padded>
                <YStack gap="$3">
                  <H4>Items</H4>
                  <RentalCheckoutCartView
                    rentalsFieldArray={rentalsFieldArray}
                    now={now}
                  />
                </YStack>
              </Card>
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
            </YStack>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
